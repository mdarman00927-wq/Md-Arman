import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import * as Sentry from "@sentry/node";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { 
  validateBody, 
  validateFileUpload, 
  chatRequestSchema, 
  scheduleRequestSchema, 
  plannerRequestSchema,
  productivityRequestSchema,
  coachRequestSchema
} from "./src/middleware/validation";
import { requireAuth, enforceOwnership } from "./src/middleware/auth";
import { corsSecure } from "./src/middleware/cors";
import { requestIdentifier, centralizedErrorHandler } from "./src/middleware/errorAndLogging";
import helmet from "helmet";
import { 
  secureAIMiddleware, 
  validateEnvironment, 
  logAICallUsage, 
  incrementTokenUsage, 
  sanitizeAIOutput 
} from "./src/middleware/aiSecurity";

dotenv.config();

// Initialize Sentry right after loading environment variables
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
  console.log("[Sentry Node] Sentry initialized successfully.");
} else {
  console.warn("[Sentry Node] Sentry was not initialized (SENTRY_DSN variable is empty).");
}

// Global exception/rejection tracking
process.on("unhandledRejection", (reason: any) => {
  console.error("[UNHANDLED REJECTION]", reason);
  Sentry.captureException(reason);
});

process.on("uncaughtException", (error: Error) => {
  console.error("[UNCAUGHT EXCEPTION]", error);
  Sentry.captureException(error);
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

const app = express();
const PORT = 3000;

// Mount unique request mapping middleware first
app.use(requestIdentifier);

// Explicitly remove X-Powered-By header
app.disable("x-powered-by");

// Apply production-grade security headers using Helmet
app.use(
  helmet({
    // Hide X-Powered-By header via helmet
    hidePoweredBy: true,
    // Disable Cross-Origin-Embedder-Policy to allow loading third-party images/audio freely from different origins
    crossOriginEmbedderPolicy: false,
    // Set X-Frame-Options: DENY in production, SAMEORIGIN in dev/sandbox to support AI Studio live preview frames
    frameguard: {
      action: process.env.NODE_ENV === "production" ? "deny" : "sameorigin",
    },
    // Set X-Content-Type-Options: nosniff
    noSniff: true,
    // Set Referrer-Policy: strict-origin-when-cross-origin
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    // Enable Strict-Transport-Security for HTTPS production environments only
    hsts: process.env.NODE_ENV === "production" ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    } : false,
    // Configure production Content-Security-Policy with strict restrictions
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // Inline scripts and eval are required in development/Vite hmr contexts
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://*.googleapis.com",
          "https://*.firebaseapp.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.cloudinary.com",
          "https://images.unsplash.com",
          "https://lh3.googleusercontent.com",
          "https://*.google.com",
          "https://*.googleapis.com",
          "https://api.cloudinary.com"
        ],
        mediaSrc: [
          "'self'",
          "https://assets.mixkit.co",
          "data:",
          "blob:"
        ],
        connectSrc: [
          "'self'",
          "https://*.googleapis.com",
          "https://*.firebaseapp.com",
          "https://*.firebaseio.com",
          "wss://*.firebaseio.com",
          "https://api.cloudinary.com",
          "https://*.cloudinary.com",
          "ws:",
          "wss:"
        ],
        frameSrc: [
          "'self'",
          "https://*.firebaseapp.com"
        ],
        // Set frame-ancestors to allow embedding only within self and Google AI Studio environments for preview functionality
        frameAncestors: [
          "'self'",
          "https://ai.studio",
          "https://*.google.com",
          "https://*.aistudio.google",
          "https://*.asia-east1.run.app",
          "https://*.run.app"
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
  })
);

app.use(express.json());

// Initialize Multer for in-memory file parsing
const upload = multer({ storage: multer.memoryStorage() });

// Rate Limiter Configurations
// 1. Auth endpoints (login, register, password reset) — 5 requests per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => {
    res.setHeader("Retry-After", "900");
    res.status(429).json(options.message);
  }
});

// 2. General API routes — 60 requests per minute per IP.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: "Too many requests. Please try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => {
    res.setHeader("Retry-After", "60");
    res.status(429).json(options.message);
  }
});

// 3. AI or LLM proxy endpoints — 10 requests per minute per user.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => {
    // Zero-Trust User Identification for Rate Limiting:
    // Derives user ID directly from the decoded Firebase ID Token header if present, falling back strictly to client IP.
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1];
        const payloadParts = token.split(".");
        if (payloadParts.length === 3) {
          const payloadB64 = payloadParts[1];
          const payloadDecoded = Buffer.from(payloadB64, "base64").toString("utf-8");
          const payloadObj = JSON.parse(payloadDecoded);
          if (payloadObj && payloadObj.sub) {
            return String(payloadObj.sub);
          }
        }
      } catch (err) {
        console.warn("[Rate Limiter] Failed to decode user authorization token during key generation:", err);
      }
    }
    return String(req.ip || "unknown-ip");
  },
  message: { error: "Too many AI assistant requests. Please try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => {
    res.setHeader("Retry-After", "60");
    res.status(429).json(options.message);
  }
});

// 4. File upload endpoints — 5 requests per minute per IP.
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Too many upload attempts. Please try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => {
    res.setHeader("Retry-After", "60");
    res.status(429).json(options.message);
  }
});

// Sitemap.xml endpoint (Auto-generated for SEO public pages)
app.get("/sitemap.xml", (req, res) => {
  const host = req.get("host");
  const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;
  const currentDate = new Date().toISOString().split("T")[0];

  const publicPages = [
    { path: "", changefreq: "daily", priority: 1.0 },
    { path: "about", changefreq: "weekly", priority: 0.8 },
    { path: "contact", changefreq: "weekly", priority: 0.7 },
    { path: "help", changefreq: "weekly", priority: 0.7 },
    { path: "privacy", changefreq: "monthly", priority: 0.5 },
    { path: "terms", changefreq: "monthly", priority: 0.5 },
    { path: "deletion", changefreq: "monthly", priority: 0.5 },
    { path: "firebase-status", changefreq: "weekly", priority: 0.4 }
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const page of publicPages) {
    const loc = page.path ? `${baseUrl}/${page.path}` : `${baseUrl}/`;
    xml += `  <url>\n`;
    xml += `    <loc>${loc}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority.toFixed(1)}</priority>\n`;
    xml += `  </url>\n`;
  }
  
  xml += "</urlset>";

  res.header("Content-Type", "application/xml");
  res.status(200).send(xml);
});

// Robots.txt endpoint
app.get("/robots.txt", (req, res) => {
  const host = req.get("host");
  const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;

  let robots = "User-agent: *\n";
  robots += "Allow: /\n";
  robots += "Allow: /about\n";
  robots += "Allow: /contact\n";
  robots += "Allow: /help\n";
  robots += "Allow: /privacy\n";
  robots += "Allow: /terms\n";
  robots += "Allow: /deletion\n";
  robots += "Allow: /firebase-status\n";
  robots += "\n";
  robots += "Disallow: /api/\n";
  robots += "Disallow: /dashboard\n";
  robots += "Disallow: /calendar\n";
  robots += "Disallow: /focus\n";
  robots += "Disallow: /notes\n";
  robots += "Disallow: /settings\n";
  robots += "Disallow: /analytics\n";
  robots += "Disallow: /social\n";
  robots += "\n";
  robots += `Sitemap: ${baseUrl}/sitemap.xml\n`;

  res.header("Content-Type", "text/plain");
  res.status(200).send(robots);
});

// Apply CORS protections first for all API routes
app.use("/api", corsSecure);

// Apply Specific Limiter Scopes
app.use("/api/auth", authLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api/upload", uploadLimiter);

// Apply General Limiter to other endpoints inside /api (except AI, auth, and upload already handled)
app.use("/api", (req, res, next) => {
  const pathPart = req.path;
  if (pathPart.startsWith("/ai") || pathPart.startsWith("/auth") || pathPart.startsWith("/upload")) {
    return next();
  }
  generalLimiter(req, res, next);
});

// Gemini Setup
const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const createTaskTool = {
  name: "create_task",
  description: "Create a new task or todo item in the application.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the task" },
      details: { type: Type.STRING, description: "Additional details about the task" },
      priority: { 
        type: Type.STRING, 
        enum: ["low", "medium", "high"],
        description: "Priority level of the task"
      },
      category: { type: Type.STRING, description: "Category like 'Work', 'Personal', etc." },
      dueDate: { type: Type.STRING, description: "Due date of the task (e.g., 'Today', 'Tomorrow', 'May 15')" },
      dueTime: { type: Type.STRING, description: "Due time of the task (e.g., '09:00', '15:30')" },
      location: { type: Type.STRING, description: "Location associated with the task" },
      tags: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of tags for the task"
      }
    },
    required: ["title"]
  }
};

const createNoteTool = {
  name: "create_note",
  description: "Create a new note in the application.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the note" },
      content: { type: Type.STRING, description: "The content of the note" },
      color: { type: Type.STRING, description: "HEX color code for the note" }
    },
    required: ["title", "content"]
  }
};

const createEventTool = {
  name: "create_event",
  description: "Schedule a new event on the calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the event" },
      date: { type: Type.STRING, description: "The date of the event" },
      time: { type: Type.STRING, description: "The time of the event" },
      location: { type: Type.STRING, description: "Where the event takes place" }
    },
    required: ["title", "date", "time"]
  }
};

// JSON response schemas
const scheduleResponseSchema = {
  type: Type.OBJECT,
  properties: {
    plan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.STRING, description: "Time slot, e.g., '09:00 AM' or '01:30 PM'" },
          duration: { type: Type.STRING, description: "Duration, e.g. '30 mins' or '1 hour'" },
          title: { type: Type.STRING, description: "A concise activity title" },
          description: { type: Type.STRING, description: "Brief description of what to focus on" },
          type: { 
            type: Type.STRING, 
            enum: ["focus", "break", "task", "routine"],
            description: "Category of action" 
          },
          associatedTaskId: { type: Type.STRING, description: "The ID of the task this activity maps to, if single-task focused" }
        },
        required: ["time", "duration", "title", "description", "type"]
      }
    },
    summary: { type: Type.STRING, description: "A friendly 1-2 sentence overview of today's workload and rhythm" }
  },
  required: ["plan", "summary"]
};

const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    workloadRating: { type: Type.STRING, description: "One of: 'Balanced', 'Light Load', 'Heavy Load', 'High Pressure'" },
    heatPercent: { type: Type.INTEGER, description: "An integer representation of workload strain from 0 to 100" },
    insights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of the suggestion or finding" },
          body: { type: Type.STRING, description: "Elaborated, actionable recommendation or finding" },
          priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "Urgency of applying this tip" }
        },
        required: ["title", "body", "priority"]
      }
    },
    coachingTip: { type: Type.STRING, description: "A motivational, high-impact quote or personalized advice" }
  },
  required: ["workloadRating", "heatPercent", "insights", "coachingTip"]
};

// 1. General Chat & Natural Language commands parser with Zod validation
app.post("/api/ai/chat", requireAuth, enforceOwnership, validateBody(chatRequestSchema), secureAIMiddleware, async (req, res, next) => {
  try {
    const { message, history, tasks, notes } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      const err = new Error("Gemini API key is not configured on the server.");
      (err as any).status = 500;
      throw err;
    }

    const { userId, ip, requestId } = (req as any).secureAI;

    // Build context prompt
    let contextStr = "";
    if (tasks && tasks.length > 0) {
      contextStr += `\n\nActive Tasks:\n` + tasks.map((t: any) => `- [${t.priority || 'medium'} priority] "${t.title}" ${t.dueDate ? `due on ${t.dueDate}` : ''}`).join('\n');
    }
    if (notes && notes.length > 0) {
      contextStr += `\n\nActive Notes:\n` + notes.map((n: any) => `- "${n.title}": "${n.content ? n.content.substring(0, 100) : ''}"`).join('\n');
    }

    const systemPrompt = "You are a helpful task organizer assistant for NexTask. You can help users create tasks, notes, and calendar events. Use the tools provided to integrate these items directly into their app. Be concise and friendly." + 
      (contextStr ? ` You are also equipped with knowledge of their active tasks and notes list:\n${contextStr}` : "");

    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash", 
      contents: [
        ...(history || []),
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: [createTaskTool, createNoteTool, createEventTool] }],
        maxOutputTokens: 1024 // 5. Token Budget Protection: set maxOutputTokens
      }
    }).catch(error => {
      console.error("[Gemini API Error] Chat generation failed:", error);
      const err = new Error("AI service temporarily unavailable.");
      (err as any).status = 503;
      throw err;
    });
    
    // Extract function calls if any
    const calls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);
    const rawText = response.text || "";
    // 7. Output Validation: Prevent structural XSS attacks dynamically
    const cleanText = sanitizeAIOutput(rawText);

    // 6. Usage Logging & budgeting tracking
    const usage = response.usageMetadata || {};
    const promptTokens = usage.promptTokenCount || Math.max(1, Math.ceil((message?.length || 0) / 4));
    const responseTokens = usage.candidatesTokenCount || Math.max(1, Math.ceil((cleanText?.length || 0) / 4));

    incrementTokenUsage(userId, promptTokens + responseTokens);
    incrementTokenUsage(ip, promptTokens + responseTokens);
    logAICallUsage(userId, ip, "gemini-3.5-flash", promptTokens, responseTokens, requestId);

    res.json({
      text: cleanText,
      functionCalls: calls
    });
  } catch (error: any) {
    next(error);
  }
});

// 2. Schedule Creator Endpoint (produces structured schedule) with Zod validation
app.post("/api/ai/schedule", requireAuth, enforceOwnership, validateBody(scheduleRequestSchema), secureAIMiddleware, async (req, res, next) => {
  try {
    const { message, tasks, timezone, date } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      const err = new Error("Gemini API key is not configured on the server.");
      (err as any).status = 500;
      throw err;
    }

    const { userId, ip, requestId } = (req as any).secureAI;

    let tasksContext = "No tasks registered.";
    if (tasks && tasks.length > 0) {
      tasksContext = tasks.map((t: any) => `Task ID: ${t.id} | Title: "${t.title}" | Priority: ${t.priority || 'medium'} | Due Date: ${t.dueDate || 'N/A'} | Due Time: ${t.dueTime || 'N/A'}`).join("\n");
    }

    const userInstructions = message ? `User specific rules: "${message}"` : "No special instructions.";
    const timezoneContext = timezone ? `User timezone: ${timezone}` : "";
    const dateContext = date ? `Target planning date: ${date}` : "";

    const prompt = `Create an optimal hour-by-hour structured daily schedule incorporating the following active user tasks:
${tasksContext}

${userInstructions}
${timezoneContext}
${dateContext}

Guidelines:
- Create a realistic plan starting around 08:30 AM or 09:00 AM (or logical times).
- Dedicate realistic "focus" blocks (30-90 mins) to major "high" or "medium" priority tasks, referencing their Task ID in "associatedTaskId" where appropriate.
- Inject "break" blocks (10-30 mins), meal breaks, and transition times to optimize focus longevity.
- Ensure all important items are budgeted for. Return the output as JSON adhering tightly to the schema structure definitions.`;

    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite, highly logical daily life organizer and schedule planner model. You parse collections of tasks and build optimal, well-paced day schedules.",
        responseMimeType: "application/json",
        responseSchema: scheduleResponseSchema,
        maxOutputTokens: 1024 // 5. Token Budget Protection: set maxOutputTokens
      }
    }).catch(error => {
      console.error("[Gemini API Error] Schedule generation failed:", error);
      const err = new Error("AI service temporarily unavailable.");
      (err as any).status = 503;
      throw err;
    });

    const rawText = response.text || "{}";
    // 7. Output Validation: Prevent structural XSS attacks dynamically
    const cleanText = sanitizeAIOutput(rawText);

    // 6. Usage Logging & budgeting tracking
    const usage = response.usageMetadata || {};
    const promptTokens = usage.promptTokenCount || Math.max(1, Math.ceil((prompt.length) / 4));
    const responseTokens = usage.candidatesTokenCount || Math.max(1, Math.ceil((cleanText.length) / 4));

    incrementTokenUsage(userId, promptTokens + responseTokens);
    incrementTokenUsage(ip, promptTokens + responseTokens);
    logAICallUsage(userId, ip, "gemini-3.5-flash", promptTokens, responseTokens, requestId);

    res.json(JSON.parse(cleanText));
  } catch (error: any) {
    next(error);
  }
});

// Alias: Planner Endpoint
app.post("/api/ai/planner", requireAuth, enforceOwnership, validateBody(plannerRequestSchema), secureAIMiddleware, async (req, res, next) => {
  try {
    const { message, tasks, timezone, date } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      const err = new Error("Gemini API key is not configured on the server.");
      (err as any).status = 500;
      throw err;
    }

    const { userId, ip, requestId } = (req as any).secureAI;

    let tasksContext = "No tasks registered.";
    if (tasks && tasks.length > 0) {
      tasksContext = tasks.map((t: any) => `Task ID: ${t.id} | Title: "${t.title}" | Priority: ${t.priority || 'medium'} | Due Date: ${t.dueDate || 'N/A'} | Due Time: ${t.dueTime || 'N/A'}`).join("\n");
    }

    const userInstructions = message ? `User specific rules: "${message}"` : "No special instructions.";
    const timezoneContext = timezone ? `User timezone: ${timezone}` : "";
    const dateContext = date ? `Target planning date: ${date}` : "";

    const prompt = `Create an optimal hour-by-hour structured daily schedule incorporating the following active user tasks:
${tasksContext}

${userInstructions}
${timezoneContext}
${dateContext}

Guidelines:
- Create a realistic plan starting around 08:30 AM or 09:00 AM (or logical times).
- Dedicate realistic "focus" blocks (30-90 mins) to major "high" or "medium" priority tasks, referencing their Task ID in "associatedTaskId" where appropriate.
- Inject "break" blocks (10-30 mins), meal breaks, and transition times to optimize focus longevity.
- Ensure all important items are budgeted for. Return the output as JSON adhering tightly to the schema structure definitions.`;

    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite, highly logical daily life organizer and schedule planner model. You parse collections of tasks and build optimal, well-paced day schedules.",
        responseMimeType: "application/json",
        responseSchema: scheduleResponseSchema,
        maxOutputTokens: 1024 // 5. Token Budget Protection: set maxOutputTokens
      }
    }).catch(error => {
      console.error("[Gemini API Error] Planner generation failed:", error);
      const err = new Error("AI service temporarily unavailable.");
      (err as any).status = 503;
      throw err;
    });

    const rawText = response.text || "{}";
    // 7. Output Validation: Prevent structural XSS attacks dynamically
    const cleanText = sanitizeAIOutput(rawText);

    // 6. Usage Logging & budgeting tracking
    const usage = response.usageMetadata || {};
    const promptTokens = usage.promptTokenCount || Math.max(1, Math.ceil((prompt.length) / 4));
    const responseTokens = usage.candidatesTokenCount || Math.max(1, Math.ceil((cleanText.length) / 4));

    incrementTokenUsage(userId, promptTokens + responseTokens);
    incrementTokenUsage(ip, promptTokens + responseTokens);
    logAICallUsage(userId, ip, "gemini-3.5-flash", promptTokens, responseTokens, requestId);

    res.json(JSON.parse(cleanText));
  } catch (error: any) {
    next(error);
  }
});

// 3. Productivity Coach Insights Analysis Endpoint with Zod validation
app.post("/api/ai/productivity", requireAuth, enforceOwnership, validateBody(productivityRequestSchema), secureAIMiddleware, async (req, res, next) => {
  try {
    const { tasks, notes, timezone, date } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      const err = new Error("Gemini API key is not configured on the server.");
      (err as any).status = 500;
      throw err;
    }

    const { userId, ip, requestId } = (req as any).secureAI;

    let tasksText = "No active tasks.";
    if (tasks && tasks.length > 0) {
      tasksText = tasks.map((t: any) => `- Title: "${t.title}" | Completed: ${t.completed} | Priority: ${t.priority || 'medium'} | Due date: ${t.dueDate || 'none'}`).join("\n");
    }

    let notesText = "No active notes.";
    if (notes && notes.length > 0) {
      notesText = notes.map((n: any) => `- Title: "${n.title}" | Content: "${n.content ? n.content.substring(0, 50) : ''}"`).join("\n");
    }

    const timezoneContext = timezone ? `User timezone context: ${timezone}` : "";
    const dateContext = date ? `Current date context: ${date}` : "";

    const prompt = `Analyze the user's workload state, task priorities, pending deadlines, and notes to formulate a productivity diagnosis and improvement blueprint.
Tasks:
${tasksText}

Notes:
${notesText}

Context:
${timezoneContext}
${dateContext}

Deliver absolute raw, highly customized suggestions inside the responseSchema format:
1. "workloadRating": Rating representing the user's workload state.
2. "heatPercent": Strain scale percentage (0% to 100%).
3. "insights": An array of maximum 3 targeted findings. Think of ideas like Pomodoro timers, high priority bottlenecks (e.g. too many High prior items), gaps in note planning, or focus blocks needed.
4. "coachingTip": A single personalized quote or piece of coaching advice.`;

    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class executive productivity coach. You analyze task lists and provide sharp, actionable feedback, prioritization strategies, and encouragement.",
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
        maxOutputTokens: 1024 // 5. Token Budget Protection: set maxOutputTokens
      }
    }).catch(error => {
      console.error("[Gemini API Error] Productivity analysis failed:", error);
      const err = new Error("AI service temporarily unavailable.");
      (err as any).status = 503;
      throw err;
    });

    const rawText = response.text || "{}";
    // 7. Output Validation: Prevent structural XSS attacks dynamically
    const cleanText = sanitizeAIOutput(rawText);

    // 6. Usage Logging & budgeting tracking
    const usage = response.usageMetadata || {};
    const promptTokens = usage.promptTokenCount || Math.max(1, Math.ceil((prompt.length) / 4));
    const responseTokens = usage.candidatesTokenCount || Math.max(1, Math.ceil((cleanText.length) / 4));

    incrementTokenUsage(userId, promptTokens + responseTokens);
    incrementTokenUsage(ip, promptTokens + responseTokens);
    logAICallUsage(userId, ip, "gemini-3.5-flash", promptTokens, responseTokens, requestId);

    res.json(JSON.parse(cleanText));
  } catch (error: any) {
    next(error);
  }
});

// Alias: Coach Endpoint
app.post("/api/ai/coach", requireAuth, enforceOwnership, validateBody(coachRequestSchema), secureAIMiddleware, async (req, res, next) => {
  try {
    const { tasks, notes, timezone, date } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      const err = new Error("Gemini API key is not configured on the server.");
      (err as any).status = 500;
      throw err;
    }

    const { userId, ip, requestId } = (req as any).secureAI;

    let tasksText = "No active tasks.";
    if (tasks && tasks.length > 0) {
      tasksText = tasks.map((t: any) => `- Title: "${t.title}" | Completed: ${t.completed} | Priority: ${t.priority || 'medium'} | Due date: ${t.dueDate || 'none'}`).join("\n");
    }

    let notesText = "No active notes.";
    if (notes && notes.length > 0) {
      notesText = notes.map((n: any) => `- Title: "${n.title}" | Content: "${n.content ? n.content.substring(0, 50) : ''}"`).join("\n");
    }

    const timezoneContext = timezone ? `User timezone context: ${timezone}` : "";
    const dateContext = date ? `Current date context: ${date}` : "";

    const prompt = `Analyze the user's workload state, task priorities, pending deadlines, and notes to formulate a productivity diagnosis and improvement blueprint.
Tasks:
${tasksText}

Notes:
${notesText}

Context:
${timezoneContext}
${dateContext}

Deliver absolute raw, highly customized suggestions inside the responseSchema format:
1. "workloadRating": Rating representing the user's workload state.
2. "heatPercent": Strain scale percentage (0% to 100%).
3. "insights": An array of maximum 3 targeted findings. Think of ideas like Pomodoro timers, high priority bottlenecks (e.g. too many High prior items), gaps in note planning, or focus blocks needed.
4. "coachingTip": A single personalized quote or piece of coaching advice.`;

    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class executive productivity coach. You analyze task lists and provide sharp, actionable feedback, prioritization strategies, and encouragement.",
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
        maxOutputTokens: 1024 // 5. Token Budget Protection: set maxOutputTokens
      }
    }).catch(error => {
      console.error("[Gemini API Error] Coach Insights failed:", error);
      const err = new Error("AI service temporarily unavailable.");
      (err as any).status = 503;
      throw err;
    });

    const rawText = response.text || "{}";
    // 7. Output Validation: Prevent structural XSS attacks dynamically
    const cleanText = sanitizeAIOutput(rawText);

    // 6. Usage Logging & budgeting tracking
    const usage = response.usageMetadata || {};
    const promptTokens = usage.promptTokenCount || Math.max(1, Math.ceil((prompt.length) / 4));
    const responseTokens = usage.candidatesTokenCount || Math.max(1, Math.ceil((cleanText.length) / 4));

    incrementTokenUsage(userId, promptTokens + responseTokens);
    incrementTokenUsage(ip, promptTokens + responseTokens);
    logAICallUsage(userId, ip, "gemini-3.5-flash", promptTokens, responseTokens, requestId);

    res.json(JSON.parse(cleanText));
  } catch (error: any) {
    next(error);
  }
});

// 4. Secured file uploads validation route (allows images <= 5MB, documents <= 25MB, UUID-based secure renaming, storing strictly in Cloudinary)
app.post("/api/upload", requireAuth, upload.single("file"), validateFileUpload, async (req, res, next) => {
  try {
    const file = req.file!;
    const originalExt = path.extname(file.originalname).toLowerCase();
    
    // Secure filename generation using UUID to prevent exposure of client-side names and path traversal exploits
    const fileUuid = crypto.randomUUID();
    const secureFileName = `${fileUuid}${originalExt}`;
    
    console.log(`[Upload Secured Processing] Sanitizing upload input: Renaming from "${file.originalname}" to "${secureFileName}" to obscure original filenames.`);

    // Read Cloudinary configs purely from safe server environment secrets
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dk30psxbj';
    const preset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'User_files';

    // Map extension to Cloudinary standard media categories
    let resourceType = 'image';
    if (file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (file.mimetype === 'application/pdf' || !file.mimetype.startsWith('image/')) {
      resourceType = 'raw';
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    // Package the memory buffer securely into a base64 Data URI string to load safely into the body
    const fileBase64 = file.buffer.toString("base64");
    const dataURI = `data:${file.mimetype};base64,${fileBase64}`;

    // Establish secure direct transmission payload
    const formData = new FormData();
    formData.append('file', dataURI);
    formData.append('upload_preset', preset);
    formData.append('public_id', fileUuid); // Overrides target names to exclude original filenames entirely

    console.log(`[Cloudinary Secure Transfer] Dispatching validated payload to Cloudinary with id context "${fileUuid}"`);
    
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorContent = await response.text();
      console.error(`[Cloudinary Remote Transfer Failed] Status Code: ${response.status}. Error Details: ${errorContent}`);
      const err = new Error("Failed upstream file transfer to Cloudinary.");
      (err as any).status = 502;
      throw err;
    }

    const responseData = await response.json();
    const secureUrl = responseData.secure_url || responseData.url;
    if (!secureUrl) {
      console.error("[Cloudinary Remote Response Malformed] No secure URL field returned.", responseData);
      throw new Error("Target Cloudinary response was empty or missing parameter secure_url.");
    }

    console.log(`[Upload SUCCESS] Successfully sanitized, renamed, and moved file to Cloudinary. Security Identifier: ${secureFileName} (${file.size} bytes)`);
    
    res.json({
      status: "success",
      message: "File passes all criteria limits (type, extension, size) and is stored securely in the cloud via server-side validation and sanitization.",
      fileDetails: {
        id: fileUuid,
        fileName: secureFileName,
        mimeType: file.mimetype,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        fileUrl: secureUrl,
        cloudinaryPublicId: responseData.public_id || fileUuid
      }
    });
  } catch (err: any) {
    next(err);
  }
});

// Register Centralized Error Handler Middleware (MUST be registered after all API routes)
app.use(centralizedErrorHandler);

async function startServer() {
  // Execute required server startup audits and configuration validations
  validateEnvironment();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
