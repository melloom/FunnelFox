import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, PIPELINE_STAGES } from "@shared/schema";
import { z } from "zod";
import { searchBusinesses, analyzeWebsite, getSearchCacheStats, clearSearchCache } from "./scraper";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { sendEmail, isGmailConnected, getGmailAddress } from "./gmail";
import { registerStripeRoutes, checkDiscoveryLimit, incrementDiscoveryUsage, checkLeadLimit } from "./stripe-routes";

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

  app.post("/api/discover", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (userId) {
        const limit = await checkDiscoveryLimit(userId);
        if (!limit.allowed) {
          return res.status(403).json({
            error: `You've used all ${limit.limit} discoveries this month. Upgrade to Pro for more.`,
            limitReached: true,
            remaining: limit.remaining,
            limit: limit.limit,
          });
        }
      }

      const { category, location, maxResults } = req.body;
      if (!category || !location) {
        return res.status(400).json({ error: "Category and location are required" });
      }

      const searchStart = Date.now();
      const businesses = await searchBusinesses(
        category,
        location,
        Math.min(maxResults || 20, 50)
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

      for (const biz of withoutWebsite) {
        try {
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

          const lead = await storage.createLead({
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
            contactEmail: null,
            contactPhone: biz.phone || null,
            socialMedia: biz.socialMedia || null,
            detectedTechnologies: null,
            screenshotUrl: null,
          });
          results.push(lead);
        } catch (err) {
          console.error(`Failed to create no-website lead ${biz.name}:`, err);
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
        await incrementDiscoveryUsage(userId);
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
      });
    } catch (err) {
      console.error("Discover error:", err);
      res.status(500).json({ error: "Failed to discover leads" });
    }
  });

  app.get("/api/gmail/status", isAuthenticated, async (_req, res) => {
    try {
      const connected = await isGmailConnected();
      const email = connected ? await getGmailAddress() : null;
      res.json({ connected, email });
    } catch (err) {
      res.json({ connected: false, email: null });
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
      const data = sendEmailSchema.parse(req.body);
      const senderName = "Melvin Peralta";
      const result = await sendEmail(data.to, data.subject, data.body, senderName);

      if (data.leadId) {
        await storage.createActivity({
          leadId: data.leadId,
          action: "email_sent",
          details: `Email sent to ${data.to}: "${data.subject}"`,
        });
      }

      res.json({ success: true, messageId: result.messageId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("Send email error:", err);
      const message = err instanceof Error ? err.message : "Failed to send email";
      res.status(500).json({ error: message });
    }
  });

  return httpServer;
}
