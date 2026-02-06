import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema } from "@shared/schema";
import { z } from "zod";
import { searchBusinesses, analyzeWebsite, getSearchCacheStats, clearSearchCache } from "./scraper";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

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
      const parsed = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(parsed);
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
      const updateSchema = insertLeadSchema.partial();
      const parsed = updateSchema.parse(req.body);
      const updated = await storage.updateLead(id, parsed);
      if (!updated) return res.status(404).json({ error: "Lead not found" });
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
            const analysis = await analyzeWebsite(biz.url);
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
            });
          })
        );

        for (const result of batchResults) {
          if (result.status === "fulfilled") {
            results.push(result.value);
          }
        }
      }

      res.json({
        found: businesses.length,
        new: results.length,
        skipped: businesses.length - newBusinesses.length,
        leads: results,
        cached,
      });
    } catch (err) {
      console.error("Discover error:", err);
      res.status(500).json({ error: "Failed to discover leads" });
    }
  });

  return httpServer;
}
