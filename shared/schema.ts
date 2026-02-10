import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "converted",
  "demo_scheduled",
  "proposal_sent",
  "negotiation",
  "lost",
]);

export const PIPELINE_STAGES = [
  { value: "new", label: "New Lead", color: "chart-1" },
  { value: "contacted", label: "Contacted", color: "chart-4" },
  { value: "interested", label: "Interested", color: "chart-2" },
  { value: "demo_scheduled", label: "Demo", color: "chart-3" },
  { value: "proposal_sent", label: "Proposal", color: "chart-5" },
  { value: "negotiation", label: "Negotiation", color: "chart-4" },
  { value: "converted", label: "Won", color: "primary" },
  { value: "lost", label: "Lost", color: "destructive" },
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number]["value"];

export const leads = pgTable("leads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  companyName: text("company_name").notNull(),
  websiteUrl: text("website_url").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  industry: text("industry"),
  location: text("location"),
  status: leadStatusEnum("status").notNull().default("new"),
  websiteScore: integer("website_score"),
  websiteIssues: text("website_issues").array(),
  notes: text("notes"),
  source: text("source").default("manual"),
  socialMedia: text("social_media").array(),
  detectedTechnologies: text("detected_technologies").array(),
  screenshotUrl: text("screenshot_url"),
  bbbRating: text("bbb_rating"),
  bbbAccredited: boolean("bbb_accredited"),
  googleRating: real("google_rating"),
  googleReviewCount: integer("google_review_count"),
  hasSitemap: boolean("has_sitemap"),
  hasRobotsTxt: boolean("has_robots_txt"),
  sitemapIssues: text("sitemap_issues").array(),
  dataSources: text("data_sources").array(),
  confidence: integer("confidence"),
  manuallyEditedFields: text("manually_edited_fields").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLeadSchema = z.object({
  companyName: z.string().min(1).max(100),
  websiteUrl: z.string().url().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  industry: z.string().max(50).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  source: z.string().default("manual"),
  status: z.string().default("new"),
  websiteScore: z.number().optional(),
  websiteIssues: z.array(z.string()).optional(),
  contactName: z.string().optional().nullable(),
  socialMedia: z.array(z.string()).optional(),
  detectedTechnologies: z.array(z.string()).optional(),
  screenshotUrl: z.string().optional().nullable(),
  bbbRating: z.string().optional().nullable(),
  bbbAccredited: z.boolean().optional(),
  googleRating: z.number().optional(),
  googleReviewCount: z.number().optional(),
  hasSitemap: z.boolean().optional(),
  hasRobotsTxt: z.boolean().optional(),
  sitemapIssues: z.array(z.string()).optional(),
  dataSources: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  manuallyEditedFields: z.array(z.string()).optional(),
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export const activityLog = pgTable("activity_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer("lead_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivitySchema = z.object({
  leadId: z.number(),
  action: z.string(),
  details: z.string().optional().nullable(),
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityLog.$inferSelect;

export * from "./models/auth";
