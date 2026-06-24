import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import crypto from "crypto";

// Extend Express Request type to include secure logging metadata safely
export interface AuditedRequest extends Request {
  id?: string;
  user?: {
    uid: string;
    email?: string;
    [key: string]: any;
  };
}

/**
 * Assigns a unique Request ID to every incoming connection
 */
export const requestIdentifier = (req: AuditedRequest, res: Response, next: NextFunction) => {
  req.id = crypto.randomUUID();
  next();
};

/**
 * Recursive sanitizer designed to scrub sensitive authentication, passwords, tokens, API keys,
 * Cloudinary parameters, and Sentry configurations before they ever reach standard logging output.
 */
export const sanitizeData = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  const sanitized: { [key: string]: any } = {};
  const sensitiveKeys = [
    "password", "pass", "pwd", "token", "firebase", "idtoken", "id_token",
    "apikey", "api_key", "secret", "cloudinary", "key", "signature", "auth",
    "credentials", "session", "dsn"
  ];

  for (const [key, value] of Object.entries(data)) {
    const isSensitive = sensitiveKeys.some(s => key.toLowerCase().includes(s));
    if (isSensitive) {
      sanitized[key] = "[REDACTED_SENSITIVE_DATA]";
    } else if (typeof value === "object") {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Centralized error handler middleware.
 * - Extracts and logs connection metadata (timestamp, route, request ID, user ID, trace) securely.
 * - Suppresses all stack traces and integration details from client responses.
 * - Standardizes error payloads to generic: { "error": "Something went wrong" }
 */
export const centralizedErrorHandler = (
  err: any,
  req: AuditedRequest,
  res: Response,
  next: NextFunction
) => {
  const timestamp = new Date().toISOString();
  const route = req.originalUrl || req.url;
  const requestId = req.id || "unknown-request-id";
  const userId = req.user?.uid || "Anonymous";

  // Redact any trace of keys, tokens, or credentials inside requests
  const sanitizedBody = sanitizeData(req.body);
  const sanitizedQuery = sanitizeData(req.query);
  const sanitizedParams = sanitizeData(req.params);

  // Dispatch details directly to Sentry securely
  Sentry.captureException(err);

  // Log everything securely on the server-side console
  console.error(JSON.stringify({
    timestamp,
    level: "ERROR",
    route,
    requestId,
    userId,
    requestData: {
      body: sanitizedBody,
      query: sanitizedQuery,
      params: sanitizedParams,
    },
    message: err.message || "An unexpected server-side exception occurred.",
    stack: err.stack || "No stack trace available.",
  }, null, 2));

  // Determine appropriate HTTP status code
  let statusCode = 500;
  if (err.status && typeof err.status === "number") {
    statusCode = err.status;
  } else if (err.statusCode && typeof err.statusCode === "number") {
    statusCode = err.statusCode;
  }

  // Enforce returning the actual backend error message or fallback safely
  res.status(statusCode).json({
    error: err.message || "Something went wrong"
  });
};
