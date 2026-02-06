import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "converted",
]);

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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
