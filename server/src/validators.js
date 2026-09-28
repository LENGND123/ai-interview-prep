import { z } from "zod";
import { httpError } from "./httpError.js";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().email("Enter a valid email").max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required").max(72),
});

export const createInterviewSchema = z.object({
  role: z.string().trim().min(2, "Role must be at least 2 characters").max(80),
  company: z.string().trim().max(80).optional().default(""),
  experienceLevel: z.enum(["intern", "junior", "mid", "senior"]),
  interviewType: z.enum(["technical", "behavioral", "mixed", "system-design"]),
  focusAreas: z.array(z.string().trim().min(1).max(40)).max(6).optional().default([]),
  questionCount: z.coerce.number().int().min(3).max(8),
});

export const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z
    .string()
    .trim()
    .min(10, "Write at least a few sentences so the evaluation is useful")
    .max(8000),
});

export function parseBody(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  const error = httpError(400, details[0]?.message || "Invalid input");
  error.details = details;
  throw error;
}
