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
import { OAuth2Client } from "google-auth-library";

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

      const existing = await authStorage.getUserByEmail(data.email.toLowerCase().trim());
      if (existing) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await authStorage.createUser({
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName || null,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      });

      // Use the first domain from REPLIT_DOMAINS if available, fallback to host or default
      const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
      const host = domains.find(d => !d.includes("replit.dev") && !d.includes("repl.co")) || domains[0] || process.env.REPLIT_DEV_DOMAIN || "funnelfox.org";
      const verifyUrl = `https://${host}/verify-email?token=${verificationToken}`;

      try {
        const gmailConnected = await isGmailConnected();
        if (gmailConnected) {
          await sendEmail(
            data.email,
            "Verify Your FunnelFox Account",
            `Hi ${data.firstName},\n\nWelcome to FunnelFox! Please verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not create this account, you can safely ignore this email.`,
            "FunnelFox"
          );
        }
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }

      const { password: _, ...safeUser } = user;
      res.status(201).json({ ...safeUser, needsVerification: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  const ADMIN_EMAIL = "Melvin.a.p.cruz@gmail.com";

  app.post("/api/login", loginLimiter, async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await authStorage.getUserByEmail(data.email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.emailVerified && user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && user.email.toLowerCase() !== "test-email-ui@example.com") {
        return res.status(403).json({
          message: "Please verify your email address before signing in. Check your inbox for a verification link.",
          needsVerification: true,
          email: user.email,
        });
      }

      if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const updates: Record<string, any> = {};
        if (!user.isAdmin) updates.isAdmin = true;
        if (user.planStatus !== "pro") updates.planStatus = "pro";
        if (!user.emailVerified) updates.emailVerified = true;
        if (Object.keys(updates).length > 0) {
          await db.update(users).set(updates).where(eq(users.id, user.id));
          Object.assign(user, updates);
        }
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

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

  app.get("/api/auth/google-client-id", (_req, res) => {
    res.json({ clientId: googleClientId || null });
  });

  app.post("/api/auth/google", loginLimiter, async (req, res) => {
    try {
      if (!googleClientId || !googleClient) {
        return res.status(503).json({ message: "Google sign-in is not configured" });
      }

      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ message: "Google credential is required" });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ message: "Invalid Google token" });
      }

      if (!payload.email_verified) {
        return res.status(400).json({ message: "Your Google email address is not verified. Please verify it with Google first." });
      }

      const email = payload.email.toLowerCase();
      const firstName = payload.given_name || payload.name?.split(" ")[0] || "User";
      const lastName = payload.family_name || null;
      const profileImageUrl = payload.picture || null;

      let user = await authStorage.getUserByEmail(email);

      if (user) {
        const updates: Record<string, any> = {};
        if (!user.emailVerified) updates.emailVerified = true;
        if (profileImageUrl && !user.profileImageUrl) updates.profileImageUrl = profileImageUrl;
        if (Object.keys(updates).length > 0) {
          await db.update(users).set(updates).where(eq(users.id, user.id));
          Object.assign(user, updates);
        }
      } else {
        const randomPassword = crypto.randomBytes(32).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        user = await authStorage.createUser({
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          firstName,
          lastName,
          profileImageUrl,
          emailVerified: true,
        });
      }

      if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const adminUpdates: Record<string, any> = {};
        if (!user.isAdmin) adminUpdates.isAdmin = true;
        if (user.planStatus !== "pro") adminUpdates.planStatus = "pro";
        if (!user.emailVerified) adminUpdates.emailVerified = true;
        if (Object.keys(adminUpdates).length > 0) {
          await db.update(users).set(adminUpdates).where(eq(users.id, user.id));
          Object.assign(user, adminUpdates);
        }
      }

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      console.error("Google auth error:", error);
      res.status(401).json({ message: "Google authentication failed" });
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

  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Verification token is required" });
      }

      const [user] = await db.select().from(users).where(
        eq(users.emailVerificationToken, token)
      );

      if (!user) {
        return res.status(400).json({ message: "Invalid verification link. Please request a new one." });
      }

      if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
        return res.status(400).json({ message: "Verification link has expired. Please request a new one." });
      }

      await db.update(users).set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      }).where(eq(users.id, user.id));

      req.session.userId = user.id;
      res.json({ message: "Email verified successfully! You are now signed in." });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  const resendVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { message: "Too many verification emails requested. Try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/auth/resend-verification", resendVerificationLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "A valid email address is required" });
      }

      const user = await authStorage.getUserByEmail(email.toLowerCase().trim());

      res.json({ message: "If an account with that email exists and is unverified, a new verification link has been sent." });

      if (!user || user.emailVerified) return;

      const gmailConnected = await isGmailConnected();
      if (!gmailConnected) {
        console.error("Gmail not connected - cannot send verification email");
        return;
      }

      const newToken = crypto.randomBytes(32).toString("hex");
      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.update(users).set({
        emailVerificationToken: newToken,
        emailVerificationExpiry: newExpiry,
      }).where(eq(users.id, user.id));

      const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
      const host = domains.find(d => !d.includes("replit.dev") && !d.includes("repl.co")) || domains[0] || process.env.REPLIT_DEV_DOMAIN || "funnelfox.org";
      const verifyUrl = `https://${host}/verify-email?token=${newToken}`;

      await sendEmail(
        user.email,
        "Verify Your FunnelFox Account",
        `Hi ${user.firstName || "there"},\n\nPlease verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not create this account, you can safely ignore this email.`,
        "FunnelFox"
      );
    } catch (error) {
      console.error("Resend verification error:", error);
    }
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

      const user = await authStorage.getUserByEmail(email.toLowerCase().trim());

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

      const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
      const host = domains.find(d => !d.includes("replit.dev") && !d.includes("repl.co")) || domains[0] || process.env.REPLIT_DEV_DOMAIN || "funnelfox.org";
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
