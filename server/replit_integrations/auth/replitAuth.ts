import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authStorage } from "./storage";
import { loginSchema, registerSchema, users } from "@shared/models/auth";
import { z } from "zod";
import { db } from "../../db";
import { eq, and, gt } from "drizzle-orm";
import { sendEmail, isGmailConnected } from "../../gmail";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many accounts created. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests. Slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(getSession());

  app.use("/api/", apiLimiter);

  app.post("/api/register", registerLimiter, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existing = await authStorage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await authStorage.createUser({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName || null,
      });

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", loginLimiter, async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await authStorage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many password reset requests. Try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/auth/forgot-password", forgotPasswordLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "A valid email address is required" });
      }

      const user = await authStorage.getUserByEmail(email);

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });

      if (!user) return;

      const gmailConnected = await isGmailConnected();
      if (!gmailConnected) {
        console.error("Gmail not connected - cannot send password reset email");
        return;
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000);

      await db.update(users).set({
        resetToken: token,
        resetTokenExpiry: expiry,
      }).where(eq(users.id, user.id));

      const host = process.env.REPLIT_DEV_DOMAIN || "funnelfox.org";
      const resetUrl = `https://${host}/reset-password?token=${token}`;

      const emailBody = `Hi ${user.firstName || "there"},

You requested a password reset for your FunnelFox account.

Click the link below to reset your password. This link expires in 1 hour.

${resetUrl}

If you did not request this, you can safely ignore this email. Your password will not be changed.`;

      await sendEmail(
        user.email,
        "Reset Your FunnelFox Password",
        emailBody,
        "FunnelFox"
      );
    } catch (error) {
      console.error("Forgot password error:", error);
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const [user] = await db.select().from(users).where(
        and(
          eq(users.resetToken, token),
          gt(users.resetTokenExpiry, new Date())
        )
      );

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db.update(users).set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      }).where(eq(users.id, user.id));

      res.json({ message: "Password has been reset successfully. You can now sign in." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
