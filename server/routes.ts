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
      const existingUrls = new Set(
        existingLeads.map((l) => {
          try {
            let u = l.websiteUrl;
            if (!u.startsWith("http")) u = `https://${u}`;
            return new URL(u).hostname.replace(/^www\./, "");
          } catch {
            return l.websiteUrl;
          }
        })
      );

      const newBusinesses = businesses.filter((biz) => {
        try {
          let u = biz.url;
          if (!u.startsWith("http")) u = `https://${u}`;
          const domain = new URL(u).hostname.replace(/^www\./, "");
          return !existingUrls.has(domain);
        } catch {
          return true;
        }
      });

      const results = [];
      const BATCH_SIZE = 3;

      for (let i = 0; i < newBusinesses.length; i += BATCH_SIZE) {
        const batch = newBusinesses.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(async (biz) => {
            const analysis = await analyzeWebsite(biz.url);
            return storage.createLead({
              companyName: biz.name,
              websiteUrl: biz.url,
              industry: category,
              location: location,
              status: "new",
              websiteScore: analysis.score,
              websiteIssues: analysis.issues,
              notes: biz.description || null,
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
