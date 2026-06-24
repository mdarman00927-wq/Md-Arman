import { Request, Response, NextFunction } from "express";

/**
 * Strict CORS Middleware
 * 1. Removes all wildcard CORS configurations (never allows '*').
 * 2. Reads allowed origins from the environment variable (FRONTEND_URL).
 * 3. Restricts HTTP methods strictly to the required set (POST & OPTIONS).
 * 4. Enables credentials only if session cookies are used (set to false for Bearer-based auth token calls).
 * 5. Rejects any unauthorized origins with a JSON 403 Forbidden payload.
 */
export const corsSecure = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // 1. Restrict HTTP Methods to POST and OPTIONS (for preflight requests)
  const allowedMethods = ["POST", "OPTIONS"];
  if (!allowedMethods.includes(req.method)) {
    console.warn(`[CORS SECURITY BLOCK] Blocked non-matching HTTP method "${req.method}" from IP ${req.ip || "unknown"} targeting ${req.originalUrl}`);
    return res.status(405).json({
      error: `Method Not Allowed: Only ${allowedMethods.join(", ")} operations are permitted.`,
    });
  }

  // Same-origin browser calls or programmatic server-to-server queries without Origin headers are passed safely
  if (!origin) {
    return next();
  }

  // 2. Resolve allowed origins from environment
  const allowedOrigins: string[] = [];
  
  if (process.env.FRONTEND_URL) {
    // Parse comma-separated origins if multiple production domains are specified
    const envOrigins = process.env.FRONTEND_URL.split(",")
      .map(o => o.trim())
      .filter(Boolean);
    allowedOrigins.push(...envOrigins);
  }

  // 3. For sandbox context (development/preview/localhost), conditionally register dev origins
  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.push(
      "https://ais-dev-pb42jpuhyjoz3b5kjk7vt2-8926320906.asia-east1.run.app",
      "https://ais-pre-pb42jpuhyjoz3b5kjk7vt2-8926320906.asia-east1.run.app",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    );
  }

  // Enforce zero-trust checking (ensure '*' can never be evaluated positively)
  const isAllowed = allowedOrigins.includes(origin) && origin !== "*";

  if (!isAllowed) {
    console.error(`[CORS SECURITY ALERT] Rejected unauthorized origin "${origin}" attempting to access ${req.originalUrl} from IP ${req.ip || "unknown"}`);
    return res.status(403).json({
      error: `CORS Block: Specified Origin "${origin}" is not authorized. Secure headers have prevented this operation.`,
    });
  }

  // 4. Configure strict, individualized CORS response headers
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", allowedMethods.join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Disable Credentials by default (tokens are supplied explicitly in the Authorization Bearer header)
  res.setHeader("Access-Control-Allow-Credentials", "false");

  // Handle preflight OPTIONS requests immediately
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
};
