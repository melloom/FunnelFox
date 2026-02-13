import {
  leads,
  activityLog,
  jobs,
  projects,
  savedJobs,
  type Lead,
  type InsertLead,
  type Activity,
  type InsertActivity,
  type InsertJob,
  type Job,
  type InsertProject,
  type Project,
  type InsertSavedJob,
  type SavedJob,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, inArray, sql, and } from "drizzle-orm";
import { users as usersTable, type User, type UpsertUser } from "@shared/models/auth";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  getLeads(userId: string): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, data: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  deleteLeads(ids: number[]): Promise<number>;
  updateLeads(ids: number[], data: Partial<InsertLead>): Promise<number>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivitiesForLeads(leadIds: number[]): Promise<Activity[]>;
  getLeadCount(): Promise<number>;
  // Job storage methods
  getJobs(userId: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  deleteJob(id: number, userId: string): Promise<boolean>;
  deleteJobs(ids: number[], userId: string): Promise<number>;
  getJobCount(userId: string): Promise<number>;
  getLeadCountForUser(userId: string): Promise<number>;
  // Saved jobs methods
  getSavedJobs(userId: string): Promise<SavedJob[]>;
  saveJob(data: InsertSavedJob): Promise<SavedJob>;
  unsaveJob(jobId: number, userId: string): Promise<boolean>;
  isJobSaved(jobId: number, userId: string): Promise<boolean>;
  getSavedJobIds(userId: string): Promise<number[]>;
  // Helper method for lead deduplication
  findLeadByWebsiteForUser(websiteUrl: string, userId: string): Promise<Lead | null>;
  findLeadByPhoneForUser(phone: string, userId: string): Promise<Lead | null>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, username));
    return user || undefined;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const [user] = await db.insert(usersTable).values(insertUser).returning();
    return user;
  }

  async getLeads(userId: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    // Check for existing lead by website or phone to prevent duplicates during creation
    if (lead.websiteUrl && lead.websiteUrl !== "none") {
      const existing = await this.findLeadByWebsiteForUser(lead.websiteUrl, lead.userId);
      if (existing) {
        // Merge data into existing lead
        const updateData: Partial<InsertLead> = {};
        if (!existing.contactPhone && lead.contactPhone) updateData.contactPhone = lead.contactPhone;
        if (!existing.contactEmail && lead.contactEmail) updateData.contactEmail = lead.contactEmail;
        if (Object.keys(updateData).length > 0) {
          await this.updateLead(existing.id, updateData);
        }
        return existing;
      }
    }
    
    if (lead.contactPhone) {
      const existing = await this.findLeadByPhoneForUser(lead.contactPhone, lead.userId);
      if (existing) {
        // Merge data into existing lead
        const updateData: Partial<InsertLead> = {};
        if (!existing.websiteUrl || existing.websiteUrl === "none" && lead.websiteUrl && lead.websiteUrl !== "none") {
          updateData.websiteUrl = lead.websiteUrl;
        }
        if (!existing.contactEmail && lead.contactEmail) updateData.contactEmail = lead.contactEmail;
        if (Object.keys(updateData).length > 0) {
          await this.updateLead(existing.id, updateData);
        }
        return existing;
      }
    }

    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  // Check if user already has a lead with this website URL
  async findLeadByWebsiteForUser(websiteUrl: string, userId: string): Promise<Lead | null> {
    if (!websiteUrl || websiteUrl === "none") return null;
    const [lead] = await db.select()
      .from(leads)
      .where(and(eq(leads.websiteUrl, websiteUrl), eq(leads.userId, userId)))
      .limit(1);
    return lead || null;
  }

  async findLeadByPhoneForUser(phone: string, userId: string): Promise<Lead | null> {
    if (!phone) return null;
    const cleaned = phone.replace(/[^0-9]/g, "").slice(-10);
    if (cleaned.length < 10) return null;
    
    // Using a pattern match to find the phone number in the database
    const [lead] = await db.select()
      .from(leads)
      .where(and(
        sql`${leads.contactPhone} IS NOT NULL`,
        eq(leads.userId, userId)
      ))
      .limit(100); // Check a reasonable number of leads
    
    if (!lead) return null;
    
    // Precise filtering in JS for reliability
    const allLeads = await db.select().from(leads).where(eq(leads.userId, userId));
    return allLeads.find(l => l.contactPhone && l.contactPhone.replace(/[^0-9]/g, "").slice(-10) === cleaned) || null;
  }

  async updateLead(id: number, data: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db
      .update(leads)
      .set(data)
      .where(eq(leads.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteLead(id: number): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id)).returning();
    return result.length > 0;
  }

  async deleteLeads(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(leads).where(inArray(leads.id, ids)).returning();
    return result.length;
  }

  async updateLeads(ids: number[], data: Partial<InsertLead>): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.update(leads).set(data).where(inArray(leads.id, ids)).returning();
    return result.length;
  }

  async getActivities(leadId: number): Promise<Activity[]> {
    return db.select().from(activityLog).where(eq(activityLog.leadId, leadId)).orderBy(desc(activityLog.createdAt));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [created] = await db.insert(activityLog).values(activity).returning();
    return created;
  }

  async getActivitiesForLeads(leadIds: number[]): Promise<Activity[]> {
    if (leadIds.length === 0) return [];
    return db.select().from(activityLog).where(inArray(activityLog.leadId, leadIds)).orderBy(desc(activityLog.createdAt));
  }

  async getLeadCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(leads);
    return Number(result?.count || 0);
  }

  async getLeadCountForUser(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.userId, userId));
    return Number(result?.count || 0);
  }

  // Job storage methods
  async getJobs(userId: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.scrapedAt));
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [created] = await db.insert(jobs).values(job).returning();
    return created;
  }

  async deleteJob(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteJobs(ids: number[], userId: string): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(jobs).where(and(inArray(jobs.id, ids), eq(jobs.userId, userId)));
    return result.rowCount || 0;
  }

  async getJobCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, userId));
    return Number(result?.count || 0);
  }

  async getSavedJobs(userId: string): Promise<SavedJob[]> {
    return db.select().from(savedJobs).where(eq(savedJobs.userId, userId)).orderBy(desc(savedJobs.savedAt));
  }

  async saveJob(data: InsertSavedJob): Promise<SavedJob> {
    const [saved] = await db.insert(savedJobs).values(data).returning();
    return saved;
  }

  async unsaveJob(jobId: number, userId: string): Promise<boolean> {
    const result = await db.delete(savedJobs).where(and(eq(savedJobs.jobId, jobId), eq(savedJobs.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async isJobSaved(jobId: number, userId: string): Promise<boolean> {
    const [result] = await db.select().from(savedJobs).where(and(eq(savedJobs.jobId, jobId), eq(savedJobs.userId, userId))).limit(1);
    return !!result;
  }

  async getSavedJobIds(userId: string): Promise<number[]> {
    const results = await db.select({ jobId: savedJobs.jobId }).from(savedJobs).where(eq(savedJobs.userId, userId));
    return results.map(r => r.jobId);
  }
}

export const storage = new DatabaseStorage();
