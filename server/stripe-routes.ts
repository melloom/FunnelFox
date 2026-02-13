import type { Express, Request, Response } from "express";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { leads } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";

export function registerStripeRoutes(app: Express) {
  app.get("/api/stripe/publishable-key", async (_req: Request, res: Response) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err) {
      res.status(500).json({ error: "Failed to get Stripe key" });
    }
  });

  app.get("/api/subscription", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ error: "User not found" });

      let resetNeeded = false;
      if (user.usageResetDate) {
        const now = new Date();
        if (now > new Date(user.usageResetDate)) {
          resetNeeded = true;
        }
      }

      let isPro = user.isAdmin || user.planStatus === "pro";

      if (resetNeeded) {
        const nextReset = getNextResetDate();
        await db.update(users).set({
          monthlyDiscoveriesUsed: 0,
          usageResetDate: nextReset,
        }).where(eq(users.id, userId));
      }

      const monthlyDiscoveriesUsed = resetNeeded ? 0 : (user.monthlyDiscoveriesUsed || 0);
      const usageResetDate = resetNeeded ? getNextResetDate().toISOString() : (user.usageResetDate ? new Date(user.usageResetDate).toISOString() : null);

      const totalLeads = await storage.getLeadCountForUser(userId);

      let stripeDetails: any = null;
      let currentSubId = user.stripeSubscriptionId;
      if (user.stripeSubscriptionId && !user.isAdmin) {
        try {
          const stripe = await getUncachableStripeClient();
          const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
            expand: ["default_payment_method"],
          });

          const stripeIsActive = sub.status === 'active' || sub.status === 'trialing';
          const stripeIsGracePeriod = sub.status === 'past_due';
          const correctPlanStatus = (stripeIsActive || stripeIsGracePeriod) ? 'pro' : 'free';

          if (user.planStatus !== correctPlanStatus) {
            console.log(`Live sync: correcting user ${userId} plan from ${user.planStatus} to ${correctPlanStatus} (Stripe status: ${sub.status})`);
            await db.update(users).set({ planStatus: correctPlanStatus }).where(eq(users.id, userId));
            isPro = correctPlanStatus === 'pro';
          }

          if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
            await db.update(users).set({
              stripeSubscriptionId: null,
              planStatus: 'free',
            }).where(eq(users.id, userId));
            isPro = false;
            currentSubId = null;
          }

          const priceAmount = sub.items?.data?.[0]?.price?.unit_amount;
          const priceInterval = sub.items?.data?.[0]?.price?.recurring?.interval;
          const pm = sub.default_payment_method as any;
          stripeDetails = {
            status: sub.status,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
            currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
            priceAmount: priceAmount ? priceAmount / 100 : null,
            priceInterval: priceInterval || null,
            cardBrand: pm?.card?.brand || null,
            cardLast4: pm?.card?.last4 || null,
          };
        } catch (stripeErr: any) {
          if (stripeErr.code === "resource_missing") {
            if (user.planStatus === 'pro') {
              console.log(`Live sync: subscription ${user.stripeSubscriptionId} not found in Stripe, downgrading user ${userId} to free`);
              await db.update(users).set({
                stripeSubscriptionId: null,
                planStatus: 'free',
              }).where(eq(users.id, userId));
              isPro = false;
              currentSubId = null;
            }
          } else {
            console.error("Error fetching stripe subscription details:", stripeErr);
          }
        }
      }

      res.json({
        planStatus: isPro ? "pro" : "free",
        monthlyDiscoveriesUsed: isPro ? monthlyDiscoveriesUsed : totalLeads,
        discoveryLimit: isPro ? (user.isAdmin ? 999 : 300) : 100,
        leadLimit: isPro ? null : 100,
        totalLeads,
        stripeSubscriptionId: currentSubId,
        stripeCustomerId: user.stripeCustomerId,
        isAdmin: user.isAdmin || false,
        usageResetDate,
        memberSince: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        stripe: stripeDetails,
      });
    } catch (err) {
      console.error("Error getting subscription:", err);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  app.post("/api/checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ error: "User not found" });

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
      }

      const prices = await stripe.prices.list({
        active: true,
        lookup_keys: ["pro_monthly"],
        limit: 1,
      });

      let priceId: string;
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      } else {
        const products = await stripe.products.list({ active: true, limit: 10 });
        const proProduct = products.data.find(p => p.name === "FunnelFox Pro" || p.name === "LeadHunter Pro");
        if (proProduct) {
          const productPrices = await stripe.prices.list({ product: proProduct.id, active: true, limit: 1 });
          if (productPrices.data.length > 0) {
            priceId = productPrices.data[0].id;
          } else {
            return res.status(400).json({ error: "No active price found" });
          }
        } else {
          return res.status(400).json({ error: "No product found. Run the seed script first." });
        }
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/subscription?success=true`,
        cancel_url: `${baseUrl}/subscription?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout error:", err);
      res.status(500).json({ error: err.message || "Failed to create checkout session" });
    }
  });

  app.post("/api/billing-portal", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/subscription`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Billing portal error:", err);
      res.status(500).json({ error: err.message || "Failed to create portal session" });
    }
  });

  app.post("/api/subscription/cancel", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      res.json({ success: true, message: "Subscription will cancel at end of billing period" });
    } catch (err: any) {
      console.error("Cancel subscription error:", err);
      res.status(500).json({ error: err.message || "Failed to cancel subscription" });
    }
  });

  app.post("/api/subscription/resume", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      res.json({ success: true, message: "Subscription resumed" });
    } catch (err: any) {
      console.error("Resume subscription error:", err);
      res.status(500).json({ error: err.message || "Failed to resume subscription" });
    }
  });

  app.post("/api/stripe/sync-subscription", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.stripeCustomerId) {
        return res.json({ synced: false, planStatus: "free" });
      }

      const stripe = await getUncachableStripeClient();
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        const nextReset = user.usageResetDate || getNextResetDate();
        await db.update(users).set({
          stripeSubscriptionId: sub.id,
          planStatus: "pro",
          usageResetDate: nextReset,
        }).where(eq(users.id, userId));
        res.json({ synced: true, planStatus: "pro" });
      } else {
        await db.update(users).set({
          stripeSubscriptionId: null,
          planStatus: "free",
        }).where(eq(users.id, userId));
        res.json({ synced: true, planStatus: "free" });
      }
    } catch (err: any) {
      console.error("Sync subscription error:", err);
      res.status(500).json({ error: "Failed to sync subscription" });
    }
  });
}

function getNextResetDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

export async function checkDiscoveryLimit(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number; isPro: boolean; maxResultsPerSearch: number }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { allowed: false, remaining: 0, limit: 0, isPro: false, maxResultsPerSearch: 5 };

  const isPro = user.planStatus === "pro" || user.isAdmin === true;

  if (user.isAdmin) return { allowed: true, remaining: 999, limit: 999, isPro: true, maxResultsPerSearch: 50 };

  const limit = isPro ? 300 : 100;
  
  if (isPro) {
    const used = user.monthlyDiscoveriesUsed || 0;
    const remaining = Math.max(0, limit - used);
    return { allowed: remaining > 0, remaining, limit, isPro, maxResultsPerSearch: 50 };
  }

  // Free users: 100 total lifetime leads
  const totalLeads = await storage.getLeadCountForUser(userId);
  const remaining = Math.max(0, limit - totalLeads);
  
  return { 
    allowed: remaining > 0, 
    remaining, 
    limit, 
    isPro, 
    maxResultsPerSearch: 5 
  };
}

export async function incrementDiscoveryUsage(userId: string, count: number = 1): Promise<void> {
  await db.update(users).set({
    monthlyDiscoveriesUsed: sql`COALESCE(${users.monthlyDiscoveriesUsed}, 0) + ${count}`,
    usageResetDate: sql`COALESCE(${users.usageResetDate}, ${getNextResetDate().toISOString()}::timestamp)`,
  }).where(eq(users.id, userId));
}

export async function checkLeadLimit(userId: string, currentLeadCount: number): Promise<{ allowed: boolean; limit: number | null }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { allowed: false, limit: 0 };

  if (user.isAdmin || user.planStatus === "pro") return { allowed: true, limit: null };
  return { allowed: currentLeadCount < 100, limit: 100 };
}
