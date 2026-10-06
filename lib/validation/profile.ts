import { z } from "zod";
import { normalizeSocial, SOCIAL_KEYS, type SocialKey, type Socials } from "@/lib/socials";

export const DISPLAY_NAME_MAX = 60;
export const BIO_MAX = 160;

const socialsInputShape = Object.fromEntries(
  SOCIAL_KEYS.map((key) => [key, z.string().max(300, "Too long")]),
) as Record<SocialKey, z.ZodString>;

/** What the Profile form edits (raw user input). */
export const profileFormSchema = z.object({
  display_name: z.string().trim().max(DISPLAY_NAME_MAX, `At most ${DISPLAY_NAME_MAX} characters`),
  bio: z.string().trim().max(BIO_MAX, `At most ${BIO_MAX} characters`),
  socials: z.object(socialsInputShape).superRefine((socials, ctx) => {
    for (const key of SOCIAL_KEYS) {
      if (normalizeSocial(key, socials[key]) === null) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: key === "email" ? "Enter a valid email address" : "Enter a valid handle or link",
        });
      }
    }
  }),
});

export type ProfileFormValues = z.input<typeof profileFormSchema>;

/** Server-side: validate + convert into the shape stored in the database. */
export const profileUpdateSchema = profileFormSchema.transform((values) => {
  const socials: Socials = {};
  for (const key of SOCIAL_KEYS) {
    const url = normalizeSocial(key, values.socials[key]);
    if (url) socials[key] = url;
  }
  return {
    display_name: values.display_name || null,
    bio: values.bio || null,
    socials,
  };
});

/** Avatar files live at "<user id>/<timestamp>.<ext>" inside the avatars bucket. */
export const avatarPathSchema = z
  .string()
  .regex(/^[0-9a-f-]{36}\/\d{10,16}\.(webp|jpg|jpeg|png)$/, "Invalid avatar path");
