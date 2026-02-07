import type { Express, Request, Response } from "express";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq, sql } from "drizzle-orm";
import { isAuthenticated } from "./replit_integrations/auth";

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
      const userId = (req as any).user?.id;
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

      if (resetNeeded) {
        const nextReset = getNextResetDate();
        await db.update(users).set({
          monthlyDiscoveriesUsed: 0,
          usageResetDate: nextReset,
        }).where(eq(users.id, userId));

        return res.json({
          planStatus: user.planStatus || "free",
          monthlyDiscoveriesUsed: 0,
          discoveryLimit: user.planStatus === "pro" ? 50 : 5,
          leadLimit: user.planStatus === "pro" ? null : 25,
          stripeSubscriptionId: user.stripeSubscriptionId,
        });
      }

      res.json({
        planStatus: user.planStatus || "free",
        monthlyDiscoveriesUsed: user.monthlyDiscoveriesUsed || 0,
        discoveryLimit: user.planStatus === "pro" ? 50 : 5,
        leadLimit: user.planStatus === "pro" ? null : 25,
        stripeSubscriptionId: user.stripeSubscriptionId,
      });
    } catch (err) {
      console.error("Error getting subscription:", err);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  app.post("/api/checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
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
        const proProduct = products.data.find(p => p.name === "LeadHunter Pro");
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
        success_url: `${baseUrl}/pricing?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout error:", err);
      res.status(500).json({ error: err.message || "Failed to create checkout session" });
    }
  });

  app.post("/api/billing-portal", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/pricing`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Billing portal error:", err);
      res.status(500).json({ error: err.message || "Failed to create portal session" });
    }
  });

  app.post("/api/stripe/sync-subscription", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
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

export async function checkDiscoveryLimit(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { allowed: false, remaining: 0, limit: 0 };

  if (user.usageResetDate && new Date() > new Date(user.usageResetDate)) {
    const nextReset = getNextResetDate();
    await db.update(users).set({
      monthlyDiscoveriesUsed: 0,
      usageResetDate: nextReset,
    }).where(eq(users.id, userId));
    const limit = user.planStatus === "pro" ? 50 : 5;
    return { allowed: true, remaining: limit, limit };
  }

  const limit = user.planStatus === "pro" ? 50 : 5;
  const used = user.monthlyDiscoveriesUsed || 0;
  const remaining = Math.max(0, limit - used);
  return { allowed: remaining > 0, remaining, limit };
}

export async function incrementDiscoveryUsage(userId: string): Promise<void> {
  await db.update(users).set({
    monthlyDiscoveriesUsed: sql`COALESCE(${users.monthlyDiscoveriesUsed}, 0) + 1`,
    usageResetDate: sql`COALESCE(${users.usageResetDate}, ${getNextResetDate().toISOString()}::timestamp)`,
  }).where(eq(users.id, userId));
}

export async function checkLeadLimit(userId: string, currentLeadCount: number): Promise<{ allowed: boolean; limit: number | null }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { allowed: false, limit: 0 };

  if (user.planStatus === "pro") return { allowed: true, limit: null };
  return { allowed: currentLeadCount < 25, limit: 25 };
}
