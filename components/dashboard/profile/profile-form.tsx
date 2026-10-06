"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { SocialIcon } from "@/components/profile/social-icon";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/lib/actions/profile";
import {
  normalizeSocial,
  SOCIAL_KEYS,
  SOCIAL_PLATFORMS,
  socialDisplayValue,
  type SocialKey,
  type Socials,
} from "@/lib/socials";
import type { ProfileData } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  profileFormSchema,
  type ProfileFormValues,
} from "@/lib/validation/profile";

type Saved = Pick<ProfileData, "display_name" | "bio" | "socials">;

function toFormValues(saved: Saved): ProfileFormValues {
  return {
    display_name: saved.display_name ?? "",
    bio: saved.bio ?? "",
    socials: Object.fromEntries(
      SOCIAL_KEYS.map((key) => [
        key,
        socialDisplayValue(key, saved.socials[key]),
      ]),
    ) as Record<SocialKey, string>,
  };
}

export function ProfileForm() {
  const { profile, setProfile } = useDashboard();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState<Saved>(() => ({
    display_name: profile.display_name,
    bio: profile.bio,
    socials: profile.socials,
  }));
  // Latest saved values + dirty flag, readable from the unmount cleanup below.
  const savedRef = useRef(saved);
  const dirtyRef = useRef(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(saved),
    mode: "onTouched",
  });
  const { errors, isDirty } = form.formState;
  const bio = useWatch({ control: form.control, name: "bio" }) ?? "";

  // Mirror every keystroke into the live preview.
  useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values, name, type }) => {
        if (type !== "change" || !name) return;
        if (name === "display_name") {
          setProfile((p) => ({
            ...p,
            display_name: values.display_name?.trim() || null,
          }));
        } else if (name === "bio") {
          setProfile((p) => ({ ...p, bio: values.bio?.trim() || null }));
        } else if (name.startsWith("socials.")) {
          const key = name.slice("socials.".length) as SocialKey;
          const url = normalizeSocial(key, values.socials?.[key] ?? "");
          setProfile((p) => {
            const socials: Socials = { ...p.socials };
            if (url) socials[key] = url;
            else delete socials[key];
            return { ...p, socials };
          });
        }
      },
    });
    return unsubscribe;
  }, [form, setProfile]);

  useEffect(() => {
    savedRef.current = saved;
    dirtyRef.current = isDirty;
  }, [saved, isDirty]);

  // Leaving the tab without saving? Put the preview back to the saved values.
  useEffect(() => {
    return () => {
      if (dirtyRef.current) setProfile((p) => ({ ...p, ...savedRef.current }));
    };
  }, [setProfile]);

  function onSubmit(values: ProfileFormValues) {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(result.data);
      setProfile((p) => ({ ...p, ...result.data }));
      form.reset(toFormValues(result.data));
      toast.success(result.message ?? "Profile saved");
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-8"
    >
      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(errors.display_name)}>
          <FieldLabel htmlFor="display_name">Display name</FieldLabel>
          <Input
            id="display_name"
            placeholder={`@${profile.username}`}
            maxLength={DISPLAY_NAME_MAX}
            aria-invalid={Boolean(errors.display_name)}
            {...form.register("display_name")}
          />
          <FieldError errors={[errors.display_name]} />
        </Field>

        <Field data-invalid={Boolean(errors.bio)}>
          <div className="flex items-baseline justify-between">
            <FieldLabel htmlFor="bio">Bio</FieldLabel>
            <span
              className={cn(
                "text-xs tabular-nums text-muted-foreground",
                bio.length > BIO_MAX - 10 && "text-amber-600",
                bio.length >= BIO_MAX && "text-destructive",
              )}
              aria-live="polite"
            >
              {bio.length}/{BIO_MAX}
            </span>
          </div>
          <Textarea
            id="bio"
            rows={3}
            maxLength={BIO_MAX}
            placeholder="Tell visitors who you are and what you do."
            aria-invalid={Boolean(errors.bio)}
            aria-describedby="bio-help"
            {...form.register("bio")}
          />
          <FieldDescription id="bio-help">
            Up to {BIO_MAX} characters.
          </FieldDescription>
          <FieldError errors={[errors.bio]} />
        </Field>
      </FieldGroup>

      <FieldSet>
        <FieldLegend>Social icons</FieldLegend>
        <FieldDescription>
          Enter a handle (like @jane) or paste a full link. Icons appear under
          your bio.
        </FieldDescription>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_KEYS.map((key) => {
            const error = errors.socials?.[key];
            const id = `social-${key}`;
            return (
              <Field key={key} data-invalid={Boolean(error)}>
                <FieldLabel htmlFor={id} className="gap-2">
                  <SocialIcon platform={key} className="size-4" />
                  {SOCIAL_PLATFORMS[key].label}
                </FieldLabel>
                <Input
                  id={id}
                  type={key === "email" ? "email" : "text"}
                  inputMode={
                    key === "email"
                      ? "email"
                      : key === "website"
                        ? "url"
                        : "text"
                  }
                  placeholder={SOCIAL_PLATFORMS[key].placeholder}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={Boolean(error)}
                  {...form.register(`socials.${key}`)}
                />
                <FieldError errors={[error]} />
              </Field>
            );
          })}
        </FieldGroup>
      </FieldSet>

      <div className="flex justify-end border-t pt-5">
        <Button
          type="submit"
          size="lg"
          disabled={isPending || !isDirty}
          className="w-full sm:w-auto"
        >
          {isPending && <Spinner />}
          {isDirty ? "Save changes" : "Saved"}
        </Button>
      </div>
    </form>
  );
}
