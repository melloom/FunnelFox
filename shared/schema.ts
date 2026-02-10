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

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
]);

export const projectPriorityEnum = pgEnum("project_priority", [
  "low",
  "medium",
  "high",
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
  userId: varchar("user_id").notNull(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLeadSchema = z.object({
  companyName: z.string().min(1).max(200),
  websiteUrl: z.string().url().min(1),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["new", "contacted", "interested", "demo_scheduled", "proposal_sent", "negotiation", "converted", "lost"]).default("new"),
  websiteScore: z.number().optional(),
  websiteIssues: z.array(z.string()).optional(),
  notes: z.string().optional(),
  source: z.string().default("manual"),
  socialMedia: z.array(z.string()).optional(),
  detectedTechnologies: z.array(z.string()).optional(),
  screenshotUrl: z.string().optional(),
  bbbRating: z.string().optional(),
  bbbAccredited: z.boolean().optional(),
  googleRating: z.number().optional(),
  googleReviewCount: z.number().optional(),
  hasSitemap: z.boolean().optional(),
  hasRobotsTxt: z.boolean().optional(),
  sitemapIssues: z.array(z.string()).optional(),
  userId: z.string(),
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

export const jobs = pgTable("jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  salary: text("salary"),
  type: text("type").notNull().default("full-time"),
  experience: text("experience").notNull().default("mid"),
  description: text("description").notNull(),
  requirements: text("requirements").array(),
  postedDate: text("posted_date").notNull(),
  source: text("source").notNull(),
  url: text("url").notNull(),
  technologies: text("technologies").array(),
  remote: boolean("remote").notNull().default(false),
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
  userId: varchar("user_id").notNull(),
});

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  client: text("client").notNull(),
  description: text("description").notNull(),
  status: projectStatusEnum("status").notNull().default("planning"),
  priority: projectPriorityEnum("priority").notNull().default("medium"),
  budget: integer("budget"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  technologies: text("technologies").array(),
  notes: text("notes"),
  leadId: integer("lead_id"),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertActivitySchema = z.object({
  leadId: z.number(),
  action: z.string(),
  details: z.string().optional().nullable(),
});

export const insertJobSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(100),
  location: z.string().min(1).max(100),
  salary: z.string().optional(),
  type: z.string().default("full-time"),
  experience: z.string().default("mid"),
  description: z.string().min(1).max(2000),
  requirements: z.array(z.string()).optional(),
  postedDate: z.string(),
  source: z.string(),
  url: z.string().url(),
  technologies: z.array(z.string()).optional(),
  remote: z.boolean().default(false),
  userId: z.string(),
});

export const insertProjectSchema = z.object({
  name: z.string().min(1).max(200),
  client: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]).default("planning"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  budget: z.number().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  technologies: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  leadId: z.number().optional().nullable(),
  userId: z.string(),
});

export const savedJobs = pgTable("saved_jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobId: integer("job_id").notNull(),
  userId: varchar("user_id").notNull(),
  notes: text("notes"),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
});

export const insertSavedJobSchema = z.object({
  jobId: z.number(),
  userId: z.string(),
  notes: z.string().optional(),
});

export const savedScrapes = pgTable("saved_scrapes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  maxResults: integer("max_results").notNull().default(20),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSavedScrapeSchema = z.object({
  category: z.string().min(1),
  location: z.string().min(1),
  maxResults: z.number().optional(),
  userId: z.string(),
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityLog.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;
export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertSavedScrape = z.infer<typeof insertSavedScrapeSchema>;
export type SavedScrape = typeof savedScrapes.$inferSelect;

export * from "./models/auth";
