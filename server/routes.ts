import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema } from "@shared/schema";
import { z } from "zod";

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

      let targetUrl = url;
      if (!targetUrl.startsWith("http")) {
        targetUrl = `https://${targetUrl}`;
      }

      const issues: string[] = [];
      let score = 100;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; LeadHunter/1.0)",
          },
        });
        clearTimeout(timeout);

        const html = await response.text();
        const lowerHtml = html.toLowerCase();

        if (!lowerHtml.includes("<meta name=\"viewport\"")) {
          issues.push("Not mobile-responsive");
          score -= 20;
        }

        if (!lowerHtml.includes("https://") && !lowerHtml.includes("ssl")) {
          if (!targetUrl.startsWith("https://")) {
            issues.push("No HTTPS");
            score -= 15;
          }
        }

        if (!lowerHtml.includes("<meta name=\"description\"")) {
          issues.push("Missing meta description");
          score -= 10;
        }

        if (!lowerHtml.includes("<title>") || lowerHtml.includes("<title></title>")) {
          issues.push("Missing or empty title tag");
          score -= 10;
        }

        const hasModernFramework =
          lowerHtml.includes("react") ||
          lowerHtml.includes("vue") ||
          lowerHtml.includes("angular") ||
          lowerHtml.includes("next") ||
          lowerHtml.includes("nuxt");

        if (!hasModernFramework) {
          issues.push("No modern framework detected");
          score -= 10;
        }

        if (!lowerHtml.includes("schema.org") && !lowerHtml.includes("json-ld")) {
          issues.push("No structured data");
          score -= 5;
        }

        if (!lowerHtml.includes("font-awesome") &&
            !lowerHtml.includes("google fonts") &&
            !lowerHtml.includes("fonts.googleapis")) {
          issues.push("No custom typography");
          score -= 5;
        }

        if (!lowerHtml.includes("analytics") && !lowerHtml.includes("gtag")) {
          issues.push("No analytics found");
          score -= 5;
        }

        const imgCount = (html.match(/<img/g) || []).length;
        const altCount = (html.match(/alt="/g) || []).length;
        if (imgCount > 0 && altCount < imgCount / 2) {
          issues.push("Images missing alt text");
          score -= 5;
        }

        if (html.length > 500000) {
          issues.push("Large page size");
          score -= 10;
        }

      } catch (fetchErr: any) {
        if (fetchErr.name === "AbortError") {
          issues.push("Very slow load time");
          score -= 25;
        } else {
          issues.push("Website unreachable");
          score -= 40;
        }
      }

      score = Math.max(0, Math.min(100, score));

      res.json({ score, issues });
    } catch (err) {
      res.status(500).json({ error: "Failed to analyze website" });
    }
  });

  return httpServer;
}
