import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};

export const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && (req.user as any)?.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
};

export function setupAuth(app: Express) {
  const PostgresSessionStore = connectPg(session);
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || "development-session-secret",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      tableName: 'sessions',
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error("Failed to deserialize user:", error);
      done(null, false);
    }
  });

  // Register endpoint
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const userData = req.body;
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(userData.password);

      const genCode = (prefix: string) =>
        `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

      const referralCodeCreator = genCode('CR');
      const referralCodeBrand = genCode('BR');

      const user = await storage.createUser({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        userType: userData.userType || 'creator',
        bio: userData.bio || '',
        location: userData.location || '',
        skills: userData.skills || [],
        twitterHandle: userData.twitterHandle || null,
        instagramHandle: userData.instagramHandle || null,
        youtubeHandle: userData.youtubeHandle || null,
        linkedinHandle: userData.linkedinHandle || null,
        companyName: userData.companyName || null,
        website: userData.website || null,
        industry: userData.industry || null,
        referralCodeCreator,
        referralCodeBrand,
      } as any);

      const refCode = userData.referralCode;
      const refType = userData.referralType || userData.userType || 'creator';
      if (refCode) {
        try {
          const referrer = await storage.getUserByReferralCode(refCode);
          if (referrer && referrer.id !== user.id) {
            await storage.createReferral({
              referrerId: referrer.id,
              referredId: user.id,
              referralType: refType,
              referralCode: refCode,
            });
            await storage.updateUserProfile(referrer.id, {
              totalReferrals: (referrer.totalReferrals || 0) + 1,
            });
          }
        } catch (refErr) {
          console.error('Referral tracking error:', refErr);
        }
      }

      try {
        await storage.awardPoints(user.id, 'signup', 50, 'Welcome bonus for joining Taskdrip!');
        if (refCode) {
          const referrer = await storage.getUserByReferralCode(refCode);
          if (referrer && referrer.id !== user.id) {
            await storage.awardPoints(referrer.id, 'referral', 100, `Referral bonus: ${user.firstName} joined via your link`);
          }
        }
      } catch (pErr) {
        console.error('Points award error:', pErr);
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ 
          message: "Account created successfully",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType,
          }
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Login endpoint — supports 2FA
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      // If 2FA is enabled, require token before establishing session
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        const { twoFactorToken } = req.body;
        if (!twoFactorToken) {
          return res.status(200).json({ requiresTwoFactor: true, message: "2FA token required" });
        }
        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: "base32",
          token: twoFactorToken,
          window: 1,
        });
        if (!verified) {
          return res.status(401).json({ message: "Invalid 2FA code" });
        }
      }

      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType,
            twoFactorEnabled: user.twoFactorEnabled,
          }
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destroy error:", sessionErr);
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/login", (_req, res) => {
    res.redirect("/login");
  });

  // Legacy login endpoint for brand dashboard compatibility
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json(user);
      });
    })(req, res, next);
  });

  // Legacy user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });

  // Legacy logout route for compatibility (redirects)
  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) console.error("Logout error:", err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) console.error("Session destroy error:", sessionErr);
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    });
  });

  // Get current user endpoint
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });

  // Change password (authenticated user)
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req.user as any).id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const passwordMatch = await comparePasswords(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashed = await hashPassword(newPassword);
      await storage.updateUserProfile(userId, { password: hashed });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Change email (authenticated user)
  app.post("/api/auth/change-email", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newEmail } = req.body;
      const userId = (req.user as any).id;

      if (!currentPassword || !newEmail) {
        return res.status(400).json({ message: "Password and new email are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const passwordMatch = await comparePasswords(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Password is incorrect" });
      }

      const existingUser = await storage.getUserByEmail(newEmail);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Email already in use" });
      }

      await storage.updateUserProfile(userId, { email: newEmail });

      res.json({ message: "Email updated successfully" });
    } catch (error) {
      console.error("Change email error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // 2FA: Generate setup secret + QR code
  app.post("/api/auth/2fa/setup", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const secret = speakeasy.generateSecret({
        name: `Taskdrip (${user.email})`,
        length: 20,
      });

      // Store secret temporarily (not yet enabled)
      await storage.updateUserProfile(user.id, { twoFactorSecret: secret.base32 } as any);

      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      res.json({
        secret: secret.base32,
        qrCode: qrCodeUrl,
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // 2FA: Enable (verify token then activate)
  app.post("/api/auth/2fa/enable", isAuthenticated, async (req, res) => {
    try {
      const { token } = req.body;
      const user = req.user as any;

      const freshUser = await storage.getUser(user.id);
      if (!freshUser?.twoFactorSecret) {
        return res.status(400).json({ message: "2FA setup not initiated. Please generate a secret first." });
      }

      const verified = speakeasy.totp.verify({
        secret: freshUser.twoFactorSecret,
        encoding: "base32",
        token,
        window: 1,
      });

      if (!verified) {
        return res.status(400).json({ message: "Invalid 2FA code. Please try again." });
      }

      await storage.updateUserProfile(user.id, { twoFactorEnabled: true } as any);

      res.json({ message: "Two-factor authentication enabled successfully" });
    } catch (error) {
      console.error("2FA enable error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // 2FA: Disable
  app.post("/api/auth/2fa/disable", isAuthenticated, async (req, res) => {
    try {
      const { password } = req.body;
      const user = req.user as any;

      if (!password) {
        return res.status(400).json({ message: "Password is required to disable 2FA" });
      }

      const freshUser = await storage.getUser(user.id);
      if (!freshUser) return res.status(404).json({ message: "User not found" });

      const passwordMatch = await comparePasswords(password, freshUser.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Password is incorrect" });
      }

      await storage.updateUserProfile(user.id, { twoFactorEnabled: false, twoFactorSecret: null } as any);

      res.json({ message: "Two-factor authentication disabled" });
    } catch (error) {
      console.error("2FA disable error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin: Reset any user's password
  app.post("/api/admin/users/:userId/reset-password", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const hashed = await hashPassword(newPassword);
      await storage.updateUserProfile(userId, { password: hashed });

      res.json({ message: `Password reset for ${user.email}` });
    } catch (error) {
      console.error("Admin reset password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin: Update any user's email
  app.post("/api/admin/users/:userId/update-email", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { newEmail } = req.body;

      if (!newEmail) {
        return res.status(400).json({ message: "New email is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const existing = await storage.getUserByEmail(newEmail);
      if (existing && existing.id !== userId) {
        return res.status(400).json({ message: "Email already in use by another account" });
      }

      await storage.updateUserProfile(userId, { email: newEmail });

      res.json({ message: `Email updated for user` });
    } catch (error) {
      console.error("Admin update email error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin: Toggle 2FA for a user
  app.post("/api/admin/users/:userId/toggle-2fa", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { enabled } = req.body;

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (enabled === false) {
        await storage.updateUserProfile(userId, { twoFactorEnabled: false, twoFactorSecret: null } as any);
        res.json({ message: "2FA disabled for user" });
      } else {
        res.status(400).json({ message: "Admin can only disable 2FA. Users must set up 2FA themselves." });
      }
    } catch (error) {
      console.error("Admin toggle 2FA error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Password reset request
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.json({ message: "If an account with that email exists, we've sent a password reset link." });
      }

      const resetToken = randomBytes(32).toString('hex');
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
      res.json({ 
        message: "If an account with that email exists, we've sent a password reset link.",
        resetToken: resetToken 
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Password reset (simplified for demo)
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, newPassword, token } = req.body;
      
      if (!email || !newPassword || !token) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid reset request" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserProfile(user.id, { password: hashedPassword });
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
}
