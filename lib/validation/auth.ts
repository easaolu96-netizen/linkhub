import { z } from "@/lib/zod";
import { weakPasswordReason } from "@/lib/validation/password";

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

const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

export const signupSchema = z
  .object({
    email: emailSchema,
    password: newPasswordSchema,
  })
  .superRefine(({ email, password }, ctx) => {
    const reason = weakPasswordReason(password, email);
    if (reason) ctx.addIssue({ code: "custom", path: ["password"], message: reason });
  });

export const setPasswordSchema = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" })
  .superRefine(({ password }, ctx) => {
    const reason = weakPasswordReason(password);
    if (reason) ctx.addIssue({ code: "custom", path: ["password"], message: reason });
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
export type SetPasswordInput = z.input<typeof setPasswordSchema>;
