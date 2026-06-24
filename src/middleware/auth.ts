import { Request, Response, NextFunction } from "express";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";

// Initialize Firebase Admin Modularly
if (getApps().length === 0) {
  try {
    initializeApp({
      projectId: "naxt-task",
    });
    console.log("[Firebase Admin] Modularly initialized successfully with projectId: naxt-task");
  } catch (error) {
    console.error("[Firebase Admin Error] Failed to initialize Firebase Admin:", error);
  }
}

// Extend Request interface to hold authenticated user
export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

// Enforce Environment Secrets Strength Check
const sessionSecret = process.env.SESSION_SECRET;
if (sessionSecret && sessionSecret.length < 32) {
  const errMsg = "CRITICAL SECURITY CONFIGURATION FAILURE: The environment variable 'SESSION_SECRET' must be at least 32 characters in length to resist brute force and collision attacks.";
  console.error(`[SECURITY FAILURE] ${errMsg}`);
  throw new Error(errMsg);
}

// Failed Authentication Lockout Storage
interface LockoutTracker {
  count: number;
  lockoutUntil: number;
}
const failedAuthenticationAttempts = new Map<string, LockoutTracker>();

/**
 * Authentication Middleware
 * 1. Verifies Bearer Token in authorization header.
 * 2. Decodes Firebase ID Token synchronously.
 * 3. Rejects with 401 Unauthorized if missing, malformed, or invalid.
 * 4. Logs blocked attempts with IP and timestamp.
 * 5. Track-and-block brute force attacks: Lockout IP for 15 mins after 5 failed attempts.
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const ip = req.ip || "unknown-ip";
  const now = Date.now();
  
  // Lockout check
  const lockout = failedAuthenticationAttempts.get(ip);
  if (lockout && lockout.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((lockout.lockoutUntil - now) / 1000);
    console.warn(`[SECURITY ALERT - BLOCKED IP] IP ${ip} rejected due to active failed-token lockout. Remaining cooling time: ${remainingSeconds}s.`);
    return res.status(429).json({ 
      error: "Too many authentication attempts or token validation failures. Your IP has been temporarily locked out.",
      retryAfter: remainingSeconds
    });
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn(`[BLOCKED ATTEMPT] Unauthorized access attempt to ${req.originalUrl} from IP ${ip} - Missing Bearer Token.`);
    return res.status(401).json({ error: "Authentication required. Please authenticate via Firebase ID Token." });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const authInstance = getAuth();
    const decodedToken = await authInstance.verifyIdToken(token);
    req.user = decodedToken;
    
    // Clear any recorded failures on successful authorization
    if (failedAuthenticationAttempts.has(ip)) {
      failedAuthenticationAttempts.delete(ip);
    }
    
    next();
  } catch (err: any) {
    console.error(`[BLOCKED ATTEMPT] Invalid credentials block on ${req.originalUrl} from IP ${ip} - Token verification failed: ${err.message}`);
    
    // Increment failed attempts and trigger lockout if limit reached
    const currentFailures = failedAuthenticationAttempts.get(ip) || { count: 0, lockoutUntil: 0 };
    currentFailures.count += 1;
    if (currentFailures.count >= 5) {
      currentFailures.lockoutUntil = now + 15 * 60 * 1000; // 15 Minute lockout duration
      console.warn(`[SECURITY LOCKOUT TRIGGERED] IP ${ip} has reached 5 failed authorization/auth token attempts. Denying access for 15 minutes.`);
    }
    failedAuthenticationAttempts.set(ip, currentFailures);

    return res.status(401).json({ error: "Unauthorized: Invalid or expired authentication token." });
  }
};

/**
 * Admin Access Middleware
 * 1. Verifies user has administrative roles.
 * 2. Checks email matches official administrator (mdarman000732@gmail.com).
 * 3. Logs unauthorized admin entry attempts.
 */
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  
  if (!user) {
    console.warn(`[BLOCKED ADMIN ATTEMPT] Anonymous user requested admin route ${req.originalUrl} from IP ${req.ip}`);
    return res.status(401).json({ error: "Authentication required." });
  }

  if (user.email !== "mdarman000732@gmail.com" || user.email_verified !== true) {
    console.warn(`[BLOCKED ADMIN ATTEMPT] Unauthorized user ${user.uid} (${user.email}) requested admin route ${req.originalUrl} from IP ${req.ip}`);
    return res.status(403).json({ error: "Forbidden: You do not possess administrative permissions to access this route." });
  }

  next();
};

/**
 * Ownership Validation Helper
 * Ensures all provided tasks and notes are owned by the authenticated user.
 * Rejects payload with 403 if IDOR context is detected.
 */
export const enforceOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const { tasks, notes } = req.body;

  // Verify tasks ownership
  if (tasks && Array.isArray(tasks)) {
    for (const task of tasks) {
      if (task.ownerId && task.ownerId !== user.uid) {
        console.warn(`[BLOCKED IDOR ATTEMPT] User ${user.uid} (${user.email}) tried to access task from another owner ${task.ownerId} from IP ${req.ip}`);
        return res.status(403).json({ error: "Forbidden: You do not have ownership rights to the specified task resources." });
      }
    }
  }

  // Verify notes ownership
  if (notes && Array.isArray(notes)) {
    for (const note of notes) {
      if (note.ownerId && note.ownerId !== user.uid) {
        console.warn(`[BLOCKED IDOR ATTEMPT] User ${user.uid} (${user.email}) tried to access note from another owner ${note.ownerId} from IP ${req.ip}`);
        return res.status(403).json({ error: "Forbidden: You do not have ownership rights to the specified note resources." });
      }
    }
  }

  next();
};
