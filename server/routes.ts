import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, PIPELINE_STAGES, leads as leadsTable, activityLog } from "@shared/schema";
import { users as usersTable } from "@shared/models/auth";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { searchBusinesses, analyzeWebsite, getSearchCacheStats, clearSearchCache, enrichContactInfo, scrapeUrlForBusinessInfo, searchBusinessesByName } from "./scraper";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { sendEmail, isGmailConnected, getGmailAddress } from "./gmail";
import { registerStripeRoutes, checkDiscoveryLimit, incrementDiscoveryUsage, checkLeadLimit } from "./stripe-routes";

function escapeHtmlForEmail(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildOutreachHtml(body: string, fromName?: string): string {
  const paragraphs = body.split('\n').map(line => {
    if (!line.trim()) return '';
    return `<p style="margin:0 0 12px 0;line-height:1.6;color:#374151;font-size:15px;">${escapeHtmlForEmail(line)}</p>`;
  }).join('\n');
  const sig = fromName ? `<p style="margin:24px 0 0;color:#6B7280;font-size:14px;">Best regards,<br/><strong style="color:#374151;">${escapeHtmlForEmail(fromName)}</strong></p>` : '';
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;"><div style="max-width:600px;margin:0 auto;padding:32px 24px;">${paragraphs}${sig}</div></body></html>`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerStripeRoutes(app);

  app.get("/api/leads", isAuthenticated, async (_req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const lead = await storage.getLead(id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (userId) {
        const existingLeads = await storage.getLeads();
        const leadCheck = await checkLeadLimit(userId, existingLeads.length);
        if (!leadCheck.allowed) {
          return res.status(403).json({
            error: `Free plan limited to ${leadCheck.limit} saved leads. Upgrade to Pro for unlimited.`,
            limitReached: true,
          });
        }
      }

      const parsed = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(parsed);
      await storage.createActivity({ leadId: lead.id, action: "created", details: "Lead created" });
      res.status(201).json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const existing = await storage.getLead(id);
      if (!existing) return res.status(404).json({ error: "Lead not found" });
      const updateSchema = insertLeadSchema.partial();
      const parsed = updateSchema.parse(req.body);
      const updated = await storage.updateLead(id, parsed);
      if (!updated) return res.status(404).json({ error: "Lead not found" });

      if (parsed.status && parsed.status !== existing.status) {
        const fromLabel = PIPELINE_STAGES.find((s) => s.value === existing.status)?.label || existing.status;
        const toLabel = PIPELINE_STAGES.find((s) => s.value === parsed.status)?.label || parsed.status;
        await storage.createActivity({
          leadId: id,
          action: "stage_changed",
          details: `${fromLabel} → ${toLabel}`,
        });
      }
      if (parsed.notes !== undefined && parsed.notes !== existing.notes) {
        await storage.createActivity({
          leadId: id,
          action: "notes_updated",
          details: parsed.notes ? "Notes updated" : "Notes cleared",
        });
      }

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/all", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (!user?.isAdmin) return res.status(403).json({ error: "Admin only" });
      const { password } = req.body || {};
      if (!password) return res.status(400).json({ error: "Password confirmation required" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(403).json({ error: "Incorrect password" });
      await db.delete(activityLog);
      await db.delete(leadsTable);
      res.json({ success: true, message: "All leads and activity logs cleared" });
    } catch (err) {
      res.status(500).json({ error: "Failed to clear leads" });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const deleted = await storage.deleteLead(id);
      if (!deleted) return res.status(404).json({ error: "Lead not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  app.post("/api/leads/bulk-delete", isAuthenticated, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      const intIds = ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
      const deleted = await storage.deleteLeads(intIds);
      res.json({ deleted });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete leads" });
    }
  });

  app.post("/api/leads/bulk-update", isAuthenticated, async (req, res) => {
    try {
      const { ids, data } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      const intIds = ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
      const updateSchema = insertLeadSchema.partial();
      const parsed = updateSchema.parse(data);
      const updated = await storage.updateLeads(intIds, parsed);
      if (parsed.status) {
        const stageLabel = PIPELINE_STAGES.find((s) => s.value === parsed.status)?.label || parsed.status;
        for (const id of intIds) {
          await storage.createActivity({
            leadId: id,
            action: "stage_changed",
            details: `Moved to ${stageLabel}`,
          });
        }
      }
      res.json({ updated });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      res.status(500).json({ error: "Failed to update leads" });
    }
  });

  app.get("/api/leads/:id/activities", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const activities = await storage.getActivities(id);
      res.json(activities);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/leads/:id/activities", isAuthenticated, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) return res.status(400).json({ error: "Invalid ID" });
      const { action, details } = req.body;
      if (!action) return res.status(400).json({ error: "action is required" });
      const activity = await storage.createActivity({ leadId, action, details: details || null });
      res.json(activity);
    } catch (err) {
      res.status(500).json({ error: "Failed to create activity" });
    }
  });

  app.get("/api/cache/stats", isAuthenticated, async (_req, res) => {
    res.json(getSearchCacheStats());
  });

  app.post("/api/cache/clear", isAuthenticated, async (_req, res) => {
    clearSearchCache();
    res.json({ success: true });
  });

  app.post("/api/analyze-website", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      const analysis = await analyzeWebsite(url);
      res.json(analysis);
    } catch (err) {
      res.status(500).json({ error: "Failed to analyze website" });
    }
  });

  app.post("/api/lookup-url", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") return res.status(400).json({ error: "URL is required" });
      const info = await scrapeUrlForBusinessInfo(url);
      res.json(info);
    } catch (err) {
      console.error("[lookup-url] Error:", err);
      res.status(500).json({ error: "Failed to look up URL" });
    }
  });

  app.post("/api/search-business", isAuthenticated, async (req, res) => {
    try {
      const { name, location } = req.body;
      if (!name || typeof name !== "string") return res.status(400).json({ error: "Business name is required" });
      const results = await searchBusinessesByName(name, location);
      res.json(results);
    } catch (err) {
      console.error("[search-business] Error:", err);
      res.status(500).json({ error: "Failed to search for business" });
    }
  });

  app.post("/api/leads/:id/enrich", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const lead = await storage.getLead(id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const websiteUrl = lead.websiteUrl && lead.websiteUrl !== "none" ? lead.websiteUrl : null;
      const analysis = await analyzeWebsite(websiteUrl || "", lead.companyName, lead.location || "");

      const updateData: Record<string, any> = {
        websiteScore: analysis.score,
        websiteIssues: analysis.issues,
      };
      if (analysis.screenshotUrl) updateData.screenshotUrl = analysis.screenshotUrl;
      if (analysis.socialMedia && analysis.socialMedia.length > 0) updateData.socialMedia = analysis.socialMedia;
      if (analysis.technologies && analysis.technologies.length > 0) updateData.detectedTechnologies = analysis.technologies;
      if (analysis.contactInfo) {
        if (analysis.contactInfo.emails?.length && !lead.contactEmail) {
          updateData.contactEmail = analysis.contactInfo.emails[0];
        }
        if (analysis.contactInfo.phones?.length && !lead.contactPhone) {
          updateData.contactPhone = analysis.contactInfo.phones[0];
        }
      }
      if (analysis.googleRating != null) updateData.googleRating = analysis.googleRating;
      if (analysis.googleReviewCount != null) updateData.googleReviewCount = analysis.googleReviewCount;
      if (analysis.hasSitemap != null) updateData.hasSitemap = analysis.hasSitemap;
      if (analysis.hasRobotsTxt != null) updateData.hasRobotsTxt = analysis.hasRobotsTxt;
      if (analysis.sitemapIssues) updateData.sitemapIssues = analysis.sitemapIssues;

      const updated = await storage.updateLead(id, updateData);
      await storage.createActivity({ leadId: id, action: "notes_updated", details: "Lead enriched with website analysis" });
      res.json(updated);
    } catch (err) {
      console.error("Enrich error:", err);
      res.status(500).json({ error: "Failed to enrich lead" });
    }
  });

  app.post("/api/discover", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      let planMaxResults = 50;
      if (userId) {
        const limit = await checkDiscoveryLimit(userId);
        if (!limit.allowed) {
          return res.status(403).json({
            error: `You've reached your monthly limit of ${limit.limit} leads. Upgrade to Pro for more.`,
            limitReached: true,
            remaining: limit.remaining,
            limit: limit.limit,
          });
        }
        planMaxResults = limit.maxResultsPerSearch;
      }

      const { category, location, maxResults, page } = req.body;
      if (!category || !location) {
        return res.status(400).json({ error: "Category and location are required" });
      }

      const searchPage = Math.max(1, Math.min(page || 1, 10));
      const searchStart = Date.now();
      const businesses = await searchBusinesses(
        category,
        location,
        Math.min(maxResults || 10, planMaxResults),
        searchPage
      );
      const searchMs = Date.now() - searchStart;
      const cached = searchMs < 500;

      const existingLeads = await storage.getLeads();
      const existingDomains = new Set<string>();
      const existingNames = new Set<string>();
      const existingPhones = new Set<string>();
      for (const l of existingLeads) {
        if (l.websiteUrl && l.websiteUrl !== "none") {
          try {
            let u = l.websiteUrl;
            if (!u.startsWith("http")) u = `https://${u}`;
            existingDomains.add(new URL(u).hostname.replace(/^www\./, ""));
          } catch {}
        }
        const normalized = l.companyName
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\b(the|and|of|in|at|by|for|llc|inc|corp|co|ltd)\b/g, "")
          .replace(/\s+/g, "")
          .slice(0, 40);
        existingNames.add(normalized);
        if (l.contactPhone) {
          existingPhones.add(l.contactPhone.replace(/[^0-9]/g, "").slice(-10));
        }
      }

      function isDuplicate(name: string, url: string | undefined, phone: string | undefined): boolean {
        const nameKey = name
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\b(the|and|of|in|at|by|for|llc|inc|corp|co|ltd)\b/g, "")
          .replace(/\s+/g, "")
          .slice(0, 40);

        if (existingNames.has(nameKey)) return true;

        for (const existing of existingNames) {
          if (nameKey.length >= 5 && existing.length >= 5) {
            if (existing.includes(nameKey) || nameKey.includes(existing)) {
              const shorter = Math.min(nameKey.length, existing.length);
              const longer = Math.max(nameKey.length, existing.length);
              if (shorter / longer >= 0.75) return true;
            }
          }
        }

        if (url) {
          try {
            let u = url;
            if (!u.startsWith("http")) u = `https://${u}`;
            const domain = new URL(u).hostname.replace(/^www\./, "");
            if (existingDomains.has(domain)) return true;
          } catch {}
        }

        if (phone) {
          const phoneKey = phone.replace(/[^0-9]/g, "").slice(-10);
          if (phoneKey.length >= 7 && existingPhones.has(phoneKey)) return true;
        }

        return false;
      }

      const newBusinesses = businesses.filter((biz) => {
        return !isDuplicate(biz.name, biz.url, biz.phone);
      });

      const results = [];
      const BATCH_SIZE = 3;

      const withWebsite = newBusinesses.filter((b) => b.hasWebsite && b.url);
      const withoutWebsite = newBusinesses.filter((b) => !b.hasWebsite || !b.url);

      const ENRICH_BATCH = 4;
      for (let ei = 0; ei < withoutWebsite.length; ei += ENRICH_BATCH) {
        const enrichBatch = withoutWebsite.slice(ei, ei + ENRICH_BATCH);
        const enrichResults = await Promise.allSettled(
          enrichBatch.map(async (biz) => {
            let bizPhone = biz.phone || null;
            let bizEmail = biz.email || null;

            if (!bizPhone || !bizEmail) {
              try {
                const enriched = await enrichContactInfo(biz.name, biz.address || location);
                if (!bizPhone && enriched.phone) bizPhone = enriched.phone;
                if (!bizEmail && enriched.email) bizEmail = enriched.email;
              } catch {}
            }

            const notesParts: string[] = [];
            if (biz.description) notesParts.push(biz.description);
            if (biz.address) notesParts.push(`Address: ${biz.address}`);
            if (biz.socialMedia?.length) {
              notesParts.push(`Has social media but no website - great lead`);
            } else {
              notesParts.push("No website detected - needs a website built");
            }
            if (biz.source && biz.source !== "web") notesParts.push(`Source: ${biz.source}`);

            const issues = ["No website found", "Business needs a website built from scratch"];
            if (biz.socialMedia?.length) {
              issues.push(`Active on social media (${biz.socialMedia.map(s => s.split(":")[0]).join(", ")}) but no website`);
            }

            return storage.createLead({
              companyName: biz.name,
              websiteUrl: "none",
              industry: category,
              location: biz.address || location,
              status: "new",
              websiteScore: 0,
              websiteIssues: issues,
              notes: notesParts.join(" | ") || null,
              source: "auto-discover",
              contactName: null,
              contactEmail: bizEmail,
              contactPhone: bizPhone,
              socialMedia: biz.socialMedia || null,
              detectedTechnologies: null,
              screenshotUrl: null,
            });
          })
        );

        for (const result of enrichResults) {
          if (result.status === "fulfilled") {
            results.push(result.value);
          }
        }
      }

      for (let i = 0; i < withWebsite.length; i += BATCH_SIZE) {
        const batch = withWebsite.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(async (biz) => {
            const analysis = await analyzeWebsite(biz.url, biz.name, biz.address || location);
            const notesParts: string[] = [];
            if (biz.description) notesParts.push(biz.description);
            if (biz.address) notesParts.push(`Address: ${biz.address}`);
            if (biz.source && biz.source !== "web") notesParts.push(`Source: ${biz.source}`);

            const allSocials = [...(biz.socialMedia || []), ...(analysis.socialMedia || [])];
            const uniqueSocials = allSocials.length ? [...new Map(allSocials.map(s => [s.split(":")[0], s])).values()] : null;

            const contactEmail = analysis.contactInfo?.emails?.[0] || null;
            const contactPhone = biz.phone || analysis.contactInfo?.phones?.[0] || null;

            if (analysis.contactInfo?.emails && analysis.contactInfo.emails.length > 1) {
              notesParts.push(`Other emails: ${analysis.contactInfo.emails.slice(1).join(", ")}`);
            }
            if (analysis.contactInfo?.phones && analysis.contactInfo.phones.length > 1) {
              notesParts.push(`Other phones: ${analysis.contactInfo.phones.slice(1).join(", ")}`);
            }
            if (analysis.contactInfo?.contactPageUrl) {
              notesParts.push(`Contact page: ${analysis.contactInfo.contactPageUrl}`);
            }

            return storage.createLead({
              companyName: biz.name,
              websiteUrl: biz.url,
              industry: category,
              location: biz.address || location,
              status: "new",
              websiteScore: analysis.score,
              websiteIssues: analysis.issues,
              notes: notesParts.join(" | ") || null,
              source: "auto-discover",
              contactName: null,
              contactEmail,
              contactPhone,
              socialMedia: uniqueSocials,
              detectedTechnologies: analysis.technologies || null,
              screenshotUrl: analysis.screenshotUrl || null,
              bbbRating: biz.bbbRating || null,
              bbbAccredited: biz.bbbAccredited || null,
              googleRating: analysis.googleRating || null,
              googleReviewCount: analysis.googleReviewCount || null,
              hasSitemap: analysis.hasSitemap || null,
              hasRobotsTxt: analysis.hasRobotsTxt || null,
              sitemapIssues: analysis.sitemapIssues || null,
            });
          })
        );

        for (const result of batchResults) {
          if (result.status === "fulfilled") {
            results.push(result.value);
          }
        }
      }

      if (userId && results.length > 0) {
        await incrementDiscoveryUsage(userId, results.length);
      }

      const updatedLimit = userId ? await checkDiscoveryLimit(userId) : null;

      res.json({
        found: businesses.length,
        new: results.length,
        skipped: businesses.length - newBusinesses.length,
        leads: results,
        cached,
        remaining: updatedLimit?.remaining,
        limit: updatedLimit?.limit,
        page: searchPage,
      });
    } catch (err) {
      console.error("Discover error:", err);
      res.status(500).json({ error: "Failed to discover leads" });
    }
  });

  app.get("/api/gmail/status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      if (!user) return res.json({ connected: false, email: null, method: null });

      if (user.smtpHost && user.smtpUser) {
        return res.json({
          connected: true,
          email: user.smtpFromEmail || user.smtpUser,
          method: "smtp",
        });
      }

      if (user.isAdmin) {
        const connected = await isGmailConnected();
        const email = connected ? await getGmailAddress() : null;
        return res.json({ connected, email, method: connected ? "system_smtp" : null });
      }

      res.json({ connected: false, email: null, method: null });
    } catch (err) {
      res.json({ connected: false, email: null, method: null });
    }
  });

  app.get("/api/email-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      res.json({
        smtpHost: user.smtpHost || "",
        smtpPort: user.smtpPort || 587,
        smtpUser: user.smtpUser || "",
        smtpPass: user.smtpPass ? "••••••••" : "",
        smtpFromName: user.smtpFromName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        smtpFromEmail: user.smtpFromEmail || "",
        smtpSecure: user.smtpSecure ?? true,
        hasPassword: !!user.smtpPass,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to get email settings" });
    }
  });

  const smtpSettingsSchema = z.object({
    smtpHost: z.string().min(1, "SMTP host is required"),
    smtpPort: z.number().min(1).max(65535),
    smtpUser: z.string().min(1, "SMTP username is required"),
    smtpPass: z.string().optional(),
    smtpFromName: z.string().optional(),
    smtpFromEmail: z.string().email("Invalid from email"),
    smtpSecure: z.boolean().optional(),
  });

  app.post("/api/email-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const data = smtpSettingsSchema.parse(req.body);
      const updateData: Record<string, any> = {
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUser: data.smtpUser,
        smtpFromName: data.smtpFromName || "",
        smtpFromEmail: data.smtpFromEmail,
        smtpSecure: data.smtpSecure ?? true,
      };
      if (data.smtpPass && data.smtpPass !== "••••••••") {
        updateData.smtpPass = data.smtpPass;
      }
      await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId));
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      res.status(500).json({ error: "Failed to save email settings" });
    }
  });

  app.delete("/api/email-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      await db.update(usersTable).set({
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPass: null,
        smtpFromName: null,
        smtpFromEmail: null,
        smtpSecure: true,
      }).where(eq(usersTable.id, userId));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to disconnect email" });
    }
  });

  app.post("/api/email-settings/test", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const settings = smtpSettingsSchema.parse(req.body);
      const password = (settings.smtpPass && settings.smtpPass !== "••••••••") ? settings.smtpPass : user.smtpPass;
      if (!password) return res.status(400).json({ error: "SMTP password is required" });

      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure ?? (settings.smtpPort === 465),
        auth: { user: settings.smtpUser, pass: password },
        connectionTimeout: 10000,
        socketTimeout: 10000,
      });

      await transporter.verify();
      res.json({ success: true, message: "Connection successful" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      res.status(400).json({ error: `Connection failed: ${message}` });
    }
  });

  const sendEmailSchema = z.object({
    to: z.string().email("Invalid recipient email"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Email body is required"),
    leadId: z.number().optional(),
  });

  app.post("/api/gmail/send", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const data = sendEmailSchema.parse(req.body);
      const senderName = user.smtpFromName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || "FunnelFox");

      if (user.smtpHost && user.smtpUser && user.smtpPass) {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.default.createTransport({
          host: user.smtpHost,
          port: user.smtpPort || 587,
          secure: user.smtpSecure ?? (user.smtpPort === 465),
          auth: { user: user.smtpUser, pass: user.smtpPass },
        });

        const fromEmail = user.smtpFromEmail || user.smtpUser;
        const info = await transporter.sendMail({
          from: `"${senderName}" <${fromEmail}>`,
          to: data.to,
          subject: data.subject,
          text: data.body,
          html: buildOutreachHtml(data.body, senderName),
        });

        if (data.leadId) {
          await storage.createActivity({
            leadId: data.leadId,
            action: "email_sent",
            details: `Email sent to ${data.to}: "${data.subject}"`,
          });
        }

        return res.json({ success: true, messageId: info.messageId });
      }

      if (user.isAdmin) {
        const result = await sendEmail(data.to, data.subject, data.body, senderName);
        if (data.leadId) {
          await storage.createActivity({
            leadId: data.leadId,
            action: "email_sent",
            details: `Email sent to ${data.to}: "${data.subject}"`,
          });
        }
        return res.json({ success: true, messageId: result.messageId });
      }

      return res.status(403).json({ error: "No email provider connected. Go to Account Settings to connect your email." });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("Send email error:", err);
      const message = err instanceof Error ? err.message : "Failed to send email";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/location-search", isAuthenticated, async (req, res) => {
    try {
      const q = (req.query.q as string || "").trim();
      if (q.length < 3) return res.json([]);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=8&countrycodes=us`,
        { headers: { "User-Agent": "FunnelFox/1.0" } }
      );
      const data = await response.json();

      const qLower = q.toLowerCase();
      const seen = new Set<string>();
      const results: Array<{ city: string; state: string; formatted: string }> = [];

      for (const item of data) {
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.hamlet || "";
        const state = addr.state || "";
        if (!city || !state) continue;
        const formatted = `${city}, ${state}`;
        const key = formatted.toLowerCase();
        if (seen.has(key)) continue;
        if (!key.includes(qLower) && !city.toLowerCase().startsWith(qLower) && !state.toLowerCase().startsWith(qLower)) continue;
        seen.add(key);
        results.push({ city, state, formatted });
        if (results.length >= 6) break;
      }

      res.json(results);
    } catch (err) {
      console.error("Location search error:", err);
      res.json([]);
    }
  });

  return httpServer;
}
