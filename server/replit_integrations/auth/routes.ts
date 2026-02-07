import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { db } from "../../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "../../stripeClient";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.delete("/api/account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId && !user.isAdmin) {
        try {
          const stripe = await getUncachableStripeClient();
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (subscription.status === "active" || subscription.status === "trialing") {
            return res.status(400).json({
              message: "Please cancel your subscription before deleting your account. You can do this from the Pricing page.",
              hasActiveSubscription: true,
            });
          }
        } catch (stripeErr: any) {
          if (stripeErr.code === "resource_missing") {
          } else {
            console.error("Error checking subscription:", stripeErr);
            return res.status(503).json({
              message: "Unable to verify subscription status. Please try again later.",
            });
          }
        }
      }

      await db.delete(users).where(eq(users.id, userId));

      req.session.destroy((err: any) => {
        if (err) console.error("Session destroy error:", err);
        res.clearCookie("connect.sid");
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });
}
