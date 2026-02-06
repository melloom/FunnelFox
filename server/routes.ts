import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema } from "@shared/schema";
import { z } from "zod";
import { searchBusinesses, analyzeWebsite } from "./scraper";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/leads", async (_req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
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

  app.post("/api/leads", async (req, res) => {
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

  app.patch("/api/leads/:id", async (req, res) => {
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

  app.delete("/api/leads/:id", async (req, res) => {
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

  app.post("/api/analyze-website", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      const analysis = await analyzeWebsite(url);
      res.json(analysis);
    } catch (err) {
      res.status(500).json({ error: "Failed to analyze website" });
    }
  });

  app.post("/api/discover", async (req, res) => {
    try {
      const { category, location, maxResults } = req.body;
      if (!category || !location) {
        return res.status(400).json({ error: "Category and location are required" });
      }

      const businesses = await searchBusinesses(
        category,
        location,
        Math.min(maxResults || 15, 30)
      );

      const existingLeads = await storage.getLeads();
      const existingDomains = new Set<string>();
      const existingNames = new Set<string>();
      for (const l of existingLeads) {
        if (l.websiteUrl && l.websiteUrl !== "none") {
          try {
            let u = l.websiteUrl;
            if (!u.startsWith("http")) u = `https://${u}`;
            existingDomains.add(new URL(u).hostname.replace(/^www\./, ""));
          } catch {}
        }
        existingNames.add(l.companyName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30));
      }

      const newBusinesses = businesses.filter((biz) => {
        const nameKey = biz.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
        if (existingNames.has(nameKey)) return false;

        if (biz.hasWebsite && biz.url) {
          try {
            let u = biz.url;
            if (!u.startsWith("http")) u = `https://${u}`;
            const domain = new URL(u).hostname.replace(/^www\./, "");
            return !existingDomains.has(domain);
          } catch {
            return true;
          }
        }
        return true;
      });

      const results = [];
      const BATCH_SIZE = 3;

      const withWebsite = newBusinesses.filter((b) => b.hasWebsite && b.url);
      const withoutWebsite = newBusinesses.filter((b) => !b.hasWebsite || !b.url);

      for (const biz of withoutWebsite) {
        try {
          const notesParts: string[] = [];
          if (biz.description) notesParts.push(biz.description);
          notesParts.push("Found on directory listing - no website detected");
          if (biz.source && biz.source !== "web") notesParts.push(`Source: ${biz.source}`);

          const lead = await storage.createLead({
            companyName: biz.name,
            websiteUrl: "none",
            industry: category,
            location: location,
            status: "new",
            websiteScore: 0,
            websiteIssues: ["No website found", "Business needs a website built from scratch"],
            notes: notesParts.join(" | ") || null,
            source: "auto-discover",
            contactName: null,
            contactEmail: null,
            contactPhone: null,
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
            if (biz.source && biz.source !== "web") notesParts.push(`Source: ${biz.source}`);

            return storage.createLead({
              companyName: biz.name,
              websiteUrl: biz.url,
              industry: category,
              location: location,
              status: "new",
              websiteScore: analysis.score,
              websiteIssues: analysis.issues,
              notes: notesParts.join(" | ") || null,
              source: "auto-discover",
              contactName: null,
              contactEmail: null,
              contactPhone: null,
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
      });
    } catch (err) {
      console.error("Discover error:", err);
      res.status(500).json({ error: "Failed to discover leads" });
    }
  });

  return httpServer;
}
