import {
  leads,
  activityLog,
  jobs,
  projects,
  type Lead,
  type InsertLead,
  type Activity,
  type InsertActivity,
  type InsertJob,
  type Job,
  type InsertProject,
  type Project,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, inArray, sql, and } from "drizzle-orm";
import { users as usersTable, type User, type UpsertUser } from "@shared/models/auth";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, data: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  deleteLeads(ids: number[]): Promise<number>;
  updateLeads(ids: number[], data: Partial<InsertLead>): Promise<number>;
  getActivities(leadId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivitiesForLeads(leadIds: number[]): Promise<Activity[]>;
  getLeadCount(): Promise<number>;
  // Job storage methods
  getJobs(userId: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  deleteJob(id: number, userId: string): Promise<boolean>;
  deleteJobs(ids: number[], userId: string): Promise<number>;
  getJobCount(userId: string): Promise<number>;
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

  async getLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
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
}

export const storage = new DatabaseStorage();
