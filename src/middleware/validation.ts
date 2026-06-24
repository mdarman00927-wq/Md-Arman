import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import path from 'path';

// Zod schemas matching our application's core data structures

export const subtaskZodSchema = z.object({
  id: z.string().min(1, "Subtask ID is required").max(50, "Subtask ID is too long").optional().nullable(),
  title: z.string().min(1, "Subtask title is required").max(255, "Subtask title is too long").optional().nullable(),
  completed: z.boolean().optional().nullable()
});

export const repeatConfigZodSchema = z.object({
  interval: z.string().optional().nullable(),
  customInterval: z.number().int().positive().optional().nullable(),
  customUnit: z.string().optional().nullable(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional().nullable(),
  endDate: z.string().max(100).optional().nullable(),
  count: z.number().int().positive().optional().nullable()
});

export const taskZodSchema = z.object({
  id: z.string().min(1, "Task ID is required").max(50, "Task ID is too long"),
  title: z.string().min(1, "Task title is required").max(255, "Task title is too long"),
  details: z.string().max(5000, "Task details is too long").optional().nullable(),
  completed: z.boolean().default(false).optional().nullable(),
  priority: z.string().optional().nullable(),
  dueDate: z.string().max(100).optional().nullable(),
  dueTime: z.string().max(100).optional().nullable(),
  category: z.string().max(100).default('Personal').optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  folder: z.string().max(100).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
  recurrence: repeatConfigZodSchema.optional().nullable(),
  ownerId: z.string().max(128).optional().nullable(),
  subtasks: z.array(subtaskZodSchema).optional().nullable()
});

export const noteZodSchema = z.object({
  id: z.string().min(1, "Note ID is required").max(50, "Note ID is too long"),
  title: z.string().min(1, "Note title is required").max(255, "Note title is too long"),
  content: z.string().max(20000, "Content cannot exceed 20,000 characters").default('').optional().nullable(),
  updatedAt: z.string().max(100).optional().nullable(),
  color: z.string().max(50).default('#ffffff').optional().nullable(),
  ownerId: z.string().max(128).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
  pinned: z.boolean().optional().nullable(),
  category: z.string().max(100).optional().nullable()
});

// Primary Endpoint schemas

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(5000, "Message cannot exceed 5000 characters"),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({
      text: z.string().max(10000, "Part text exceeds limits")
    })).min(1, "A parts entry must be supplied")
  })).optional(),
  tasks: z.array(taskZodSchema).optional(),
  notes: z.array(noteZodSchema).optional()
});

export const scheduleRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  tasks: z.array(taskZodSchema).min(1, "At least one task is required"),
  preferences: z.record(z.string(), z.any()).default({}),
  timezone: z.string().min(1, "Timezone is required"),
  date: z.string().min(1, "Date is required"),
  message: z.string().max(2000, "Message instruction is too long").optional()
});

export const plannerRequestSchema = scheduleRequestSchema;

export const productivityRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  tasks: z.array(taskZodSchema).min(1, "At least one task is required"),
  notes: z.array(noteZodSchema).optional().nullable().default([]),
  preferences: z.record(z.string(), z.any()).default({}),
  timezone: z.string().min(1, "Timezone is required"),
  date: z.string().min(1, "Date is required")
});

export const coachRequestSchema = productivityRequestSchema;

/**
 * Higher-order middleware to validate request payload body against a Zod schema.
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = (err as any).issues || (err as any).errors || [];
        // Server-side logging of validation errors:
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "VALIDATION_ERROR",
          route: req.originalUrl || req.url,
          userId: (req as any).user?.uid || "Anonymous",
          requestData: req.body,
          issues: issues.map((e: any) => ({
            field: e.path ? e.path.join('.') : 'unknown',
            message: e.message || 'Validation error'
          }))
        }, null, 2));

        return res.status(400).json({
          error: "Something went wrong"
        });
      }
      next(err);
    }
  };
};

/**
 * Middleware validating file attachments strictly on the server side
 * Allowed: JPEG, PNG, WEBP (under 5MB), and safe documents (under 25MB)
 * Reject and block executable file configurations
 */
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;
  if (!file) {
    console.warn(`[Validation Alert] Missing file upload for ${req.originalUrl} from IP ${req.ip}`);
    return res.status(400).json({ error: "No file was received." });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  
  // 1. Proactively Reject Executables & Harmful Scripts (Critical anti-malware block)
  const rejectedExtensions = [
    '.exe', '.sh', '.bat', '.cmd', '.com', '.bin', '.msi', '.vbs', '.js', '.ts', 
    '.scr', '.pif', '.app', '.html', '.htm', '.php', '.py', '.pl', '.dll', '.jar'
  ];
  if (rejectedExtensions.includes(ext)) {
    console.warn(`[SECURITY WARN - EXECUTABLE BLOCKED] Blocked executable/script extension "${ext}" from IP ${req.ip}`);
    return res.status(400).json({
      error: `Security Violation: File types with extension "${ext}" are strictly forbidden due to system integrity policies.`
    });
  }

  // 2. Classify & Validate Target File
  const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  const allowedDocExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'];
  const allowedDocMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ];

  const isImageFile = allowedImageExtensions.includes(ext) || allowedImageMimeTypes.includes(file.mimetype);
  const isDocFile = allowedDocExtensions.includes(ext) || allowedDocMimeTypes.includes(file.mimetype);

  if (!isImageFile && !isDocFile) {
    console.warn(`[Validation Alert] Rejected file upload target. Mimetype: "${file.mimetype}", Ext: "${ext}" from IP ${req.ip}`);
    return res.status(400).json({
      error: "Bad Request: Forbidden file format. Only images (.jpg, .jpeg, .png, .webp) and standard documents are supported."
    });
  }

  // Double check MIME-Type matches extension criteria strictly to prevent extension mismatch tricks
  if (isImageFile) {
    if (!allowedImageExtensions.includes(ext) || !allowedImageMimeTypes.includes(file.mimetype)) {
      console.warn(`[Validation Alert] Extension/MIME-Type mismatch on image. Mimetype: "${file.mimetype}", Ext: "${ext}"`);
      return res.status(400).json({ error: "Bad Request: Image file configuration mismatch." });
    }
    
    // Size limit check (Max 5MB)
    const maxImageBytes = 5 * 1024 * 1024;
    if (file.size > maxImageBytes) {
      console.warn(`[Validation Alert] Rejected image due to size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return res.status(400).json({ error: "Bad Request: Image size exceeds the 5 MB limit." });
    }
  } else if (isDocFile) {
    if (!allowedDocExtensions.includes(ext) || !allowedDocMimeTypes.includes(file.mimetype)) {
      console.warn(`[Validation Alert] Extension/MIME-Type mismatch on document. Mimetype: "${file.mimetype}", Ext: "${ext}"`);
      return res.status(400).json({ error: "Bad Request: Document file configuration mismatch." });
    }

    // Size limit check (Max 25MB)
    const maxDocBytes = 25 * 1024 * 1024;
    if (file.size > maxDocBytes) {
      console.warn(`[Validation Alert] Rejected document due to size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return res.status(400).json({ error: "Bad Request: Document size exceeds the 25 MB limit." });
    }
  }

  next();
};
