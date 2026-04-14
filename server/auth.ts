import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";

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

export function setupAuth(app: Express) {
  const PostgresSessionStore = connectPg(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      tableName: 'sessions',
    }),
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
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
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash the password
      const hashedPassword = await hashPassword(userData.password);

      // Generate unique referral codes
      const genCode = (prefix: string) =>
        `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

      const referralCodeCreator = genCode('CR');
      const referralCodeBrand = genCode('BR');

      // Create user with hashed password and proper defaults
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

      // Handle referral tracking — if they came via a referral link
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
            // Increment referrer's count
            await storage.updateUserProfile(referrer.id, {
              totalReferrals: (referrer.totalReferrals || 0) + 1,
            });
          }
        } catch (refErr) {
          console.error('Referral tracking error:', refErr);
        }
      }

      // Award signup points (+50) and referral points to referrer (+100)
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

      // Log them in automatically
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

  // Login endpoint
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType,
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
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
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
      if (err) {
        console.error("Logout error:", err);
      }
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destroy error:", sessionErr);
        }
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

  // Password reset request
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with that email exists, we've sent a password reset link." });
      }

      // Generate reset token (in production, you'd send this via email)
      const resetToken = randomBytes(32).toString('hex');
      
      // Store reset token temporarily (in production, store in database with expiration)
      // For now, we'll just log it for demo purposes
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
      res.json({ 
        message: "If an account with that email exists, we've sent a password reset link.",
        // In demo mode, return the token directly
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

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user password
      await storage.updateUserProfile(user.id, { password: hashedPassword });
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
}