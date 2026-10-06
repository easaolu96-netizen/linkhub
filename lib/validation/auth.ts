import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .pipe(z.email("Enter a valid email address"))
  .transform((value) => value.toLowerCase());

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(72, "Password is too long"),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"),
});

/** Code from the confirmation email (6 digits by default; Supabase allows up to 10). */
export const emailCodeSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{6,10}$/, "Enter the code from the email")),
});

export type LoginInput = z.input<typeof loginSchema>;
export type SignupInput = z.input<typeof signupSchema>;
