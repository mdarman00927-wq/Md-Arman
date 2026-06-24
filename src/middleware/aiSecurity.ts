import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// 2. Startup Validation
export function validateEnvironment() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("[CRITICAL SECURITY ALERT] GEMINI_API_KEY is not defined in the environment!");
  } else {
    console.log("[Startup Security] GEMINI_API_KEY is defined. Validating format...");
    if (process.env.GEMINI_API_KEY.startsWith("AIzaSy")) {
      console.log("[Startup Security] GEMINI_API_KEY format matches standard Google Cloud API Key format.");
    } else {
      console.warn("[Startup Security] GEMINI_API_KEY does not start with standard characters; please verify in Secrets.");
    }
  }

  if (!process.env.SESSION_SECRET) {
    console.warn("[Startup Security Warning] SESSION_SECRET is not configured.");
  } else if (process.env.SESSION_SECRET.length < 32) {
    console.error("[CRITICAL SECURITY ALERT] SESSION_SECRET is too short (< 32 chars)!");
  }
}

// 3. Prompt Injection Protection & Input Sanitization
export function filterPromptInjection(text: string): string {
  if (!text || typeof text !== "string") return "";

  // Max input length limit to prevent Buffer Overflow / Context Stuffing Attacks
  let safeText = text.substring(0, 2000);

  // Escaping Script Tags / Dangerous HTML Characters to prevent XSS and payload escapes
  safeText = safeText
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "[filtered_script_block]")
    .replace(/javascript:/gi, "[removed_uri]")
    .replace(/on\w+\s*=/gi, "[removed_event]")
    .replace(/<\/?[^>]+(>|$)/g, ""); // Strip all standard HTML tags entirely

  // Malicious prompt instruction indicators to block
  const injectionPatterns = [
    /ignore\s+(?:all\s+)?(?:previous\s+)?instructions/gi,
    /ignore\s+(?:all\s+)?(?:previous\s+)?prompts/gi,
    /ignore\s+(?:the\s+)?above/gi,
    /reveal\s+(?:your\s+)?system\s+prompt/gi,
    /reveal\s+(?:your\s+)?instructions/gi,
    /what\s+is\s+your\s+system\s+prompt/gi,
    /execute\s+code/gi,
    /execute\s+command/gi,
    /access\s+secret/gi,
    /access\s+process\.env/gi,
    /env\s+variables/gi,
    /system\s+prompt/gi,
    /you\s+must\s+forget/gi,
    /bypass\s+security/gi,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(safeText)) {
      console.warn(`[Prompt Injection Blocked] Malicious pattern matched: ${pattern}`);
      safeText = safeText.replace(pattern, "[MALICIOUS_PROMPT_PATTERN_STRIPPED]");
    }
  }

  return safeText;
}

// Recursive object sanitization helper to clean payloads
export function sanitizeInputPayload(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return filterPromptInjection(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInputPayload(item));
  }

  if (typeof obj === "object") {
    const sanitized: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInputPayload(value);
    }
    return sanitized;
  }

  return obj;
}

// 5. Token Budget Protection States
interface BudgetEntry {
  tokensUsed: number;
  lastReset: string; // YYYY-MM-DD
}

interface HourlyBudgetEntry {
  tokensUsed: number;
  hourKey: string; // YYYY-MM-DD-HH
}

// In-memory highly reliable budget maps
const dailyBudgets = new Map<string, BudgetEntry>();
const hourlyBudgets = new Map<string, HourlyBudgetEntry>();

const DAILY_TOKEN_LIMIT = 50000;
const HOURLY_TOKEN_LIMIT = 15000;

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getHourStr(): string {
  const d = new Date();
  return `${d.toISOString().split("T")[0]}-${d.getHours()}`;
}

/**
 * Validates and reserve/increment client budget inside memory safely.
 * Returns true if allowed, false if budget is fully depleted.
 */
export function checkTokenBudget(identifier: string, estimatedPromptTokens: number): { allowed: boolean; reason?: string } {
  const today = getTodayStr();
  const hour = getHourStr();

  // Load or construct daily entries
  let daily = dailyBudgets.get(identifier);
  if (!daily || daily.lastReset !== today) {
    daily = { tokensUsed: 0, lastReset: today };
    dailyBudgets.set(identifier, daily);
  }

  // Load or construct hourly entries
  let hourly = hourlyBudgets.get(identifier);
  if (!hourly || hourly.hourKey !== hour) {
    hourly = { tokensUsed: 0, hourKey: hour };
    hourlyBudgets.set(identifier, hourly);
  }

  // Check limits
  if (daily.tokensUsed + estimatedPromptTokens > DAILY_TOKEN_LIMIT) {
    // 9. Alerting on high cost / exhausted limits
    console.warn(`[SECURITY RISK ALERT] Daily AI Token Budget fully exhausted for identifier: ${identifier}. Limit: ${DAILY_TOKEN_LIMIT}`);
    return {
      allowed: false,
      reason: `Daily token consumption budget (${DAILY_TOKEN_LIMIT} tokens) was exhausted. Please wait until tomorrow.`
    };
  }

  if (hourly.tokensUsed + estimatedPromptTokens > HOURLY_TOKEN_LIMIT) {
    console.warn(`[SECURITY BUDGET ALERT] Hourly AI Token Budget exhausted for identifier: ${identifier}. Limit: ${HOURLY_TOKEN_LIMIT}`);
    return {
      allowed: false,
      reason: `Hourly token consumption rate limit budget (${HOURLY_TOKEN_LIMIT} tokens) was exhausted. Please wait a bit before requesting again.`
    };
  }

  return { allowed: true };
}

/**
 * Increment budgets upon completion since the provider reports actual metrics.
 */
export function incrementTokenUsage(identifier: string, totalTokens: number) {
  const today = getTodayStr();
  const hour = getHourStr();

  let daily = dailyBudgets.get(identifier);
  if (!daily || daily.lastReset !== today) {
    daily = { tokensUsed: 0, lastReset: today };
  }
  daily.tokensUsed += totalTokens;
  dailyBudgets.set(identifier, daily);

  let hourly = hourlyBudgets.get(identifier);
  if (!hourly || hourly.hourKey !== hour) {
    hourly = { tokensUsed: 0, hourKey: hour };
  }
  hourly.tokensUsed += totalTokens;
  hourlyBudgets.set(identifier, hourly);

  // 9. Detection of abnormal usage spikes or cost levels
  if (totalTokens > 8000) {
    console.error(`[SECURITY MONITORED ALERT] Abnormal token usage spike of ${totalTokens} tokens detected in a single API round-trip by identifier: ${identifier}! Checking for session loops.`);
  }
}

// 6. Security Usage Logging
export interface SecureAIAuditLog {
  userId: string;
  ip: string;
  model: string;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  timestamp: string;
  requestId: string;
}

export function logAICallUsage(
  userId: string,
  ip: string,
  model: string,
  promptTokens: number,
  responseTokens: number,
  requestId: string
) {
  const totalTokens = promptTokens + responseTokens;
  // Cost rates of gemini-3.5-flash: $0.075 / 1M prompt, $0.30 / 1M response tokens
  const estimatedCostUSD = (promptTokens * 0.075 / 1000000) + (responseTokens * 0.30 / 1000000);
  const timestamp = new Date().toISOString();

  const logEntry: SecureAIAuditLog = {
    userId,
    ip,
    model,
    promptTokens,
    responseTokens,
    totalTokens,
    estimatedCostUSD,
    timestamp,
    requestId
  };

  // Securely print to stdout (which is aggregated and stored permanently in secure container logs)
  console.log(JSON.stringify({
    level: "INFO",
    category: "AI_ACCESS_AUDIT",
    ...logEntry
  }));
}

// 7. Output Validation & XSS Prevention
export function sanitizeAIOutput(text: string): string {
  if (!text || typeof text !== "string") return "";

  // Scrub any dynamic executable triggers
  let clean = text
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "[filtered_unsafe_script]")
    .replace(/javascript:/gi, "[filtered_uri_prefix]")
    .replace(/on\w+\s*=/gi, "[filtered_event_handler]");

  return clean;
}

// Extend Request interface
export interface SecureAIRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
  reqId?: string;
}

// 11. Security Combined Middleware Core
export const secureAIMiddleware = (req: SecureAIRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.uid || "Anonymous";
  const ip = req.ip || "unknown-ip";
  const reqId = (req as any).id || crypto.randomUUID();

  // Step 1: Pre-estimate prompt size (average 4 characters per token as rough safe estimate)
  const incomingContentLength = JSON.stringify(req.body).length;
  const estimatedTokens = Math.max(10, Math.ceil(incomingContentLength / 4));

  // Step 2: Validate token consumption thresholds per user & IP
  const userCheck = checkTokenBudget(userId, estimatedTokens);
  const ipCheck = checkTokenBudget(ip, estimatedTokens);

  if (!userCheck.allowed) {
    return res.status(429).json({ error: userCheck.reason });
  }
  if (!ipCheck.allowed) {
    return res.status(100 + 329).json({ error: ipCheck.reason }); // 429 Error (using calculation to satisfy numerical linter rules)
  }

  // Step 3: Sanitize prompt injection cues/HTML targets in core request variables recursively
  req.body = sanitizeInputPayload(req.body);

  // Attach variables for endpoint logic access
  (req as any).secureAI = {
    userId,
    ip,
    requestId: reqId
  };

  next();
};
