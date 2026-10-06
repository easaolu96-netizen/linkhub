"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createLink } from "@/lib/actions/links";
import { LINK_TITLE_MAX, linkInputSchema } from "@/lib/validation/link";

type FormInput = z.input<typeof linkInputSchema>;
type FormOutput = z.output<typeof linkInputSchema>;

export function AddLinkForm({ onDone }: { onDone: () => void }) {
  const { setLinks } = useDashboard();
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(linkInputSchema),
    defaultValues: { title: "", url: "" },
  });
  const { errors } = form.formState;

  function onSubmit(values: FormOutput) {
    startTransition(async () => {
      const result = await createLink(values);
      if (!result.ok) {
        toast.error(result.error);
        const urlError = result.fieldErrors?.url?.[0];
        if (urlError) form.setError("url", { message: urlError });
        return;
      }
      setLinks((links) => [{ ...result.data, clicks: 0 }, ...links]);
      toast.success(result.message ?? "Link added");
      form.reset();
      onDone();
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="rounded-xl border bg-surface p-5"
      aria-label="Add a new link"
    >
      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="new-link-title">Title</FieldLabel>
          <Input
            id="new-link-title"
            placeholder="My portfolio"
            maxLength={LINK_TITLE_MAX}
            autoFocus
            aria-invalid={Boolean(errors.title)}
            {...form.register("title")}
          />
          <FieldError errors={[errors.title]} />
        </Field>
        <Field data-invalid={Boolean(errors.url)}>
          <FieldLabel htmlFor="new-link-url">URL</FieldLabel>
          <Input
            id="new-link-url"
            type="url"
            inputMode="url"
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.url)}
            {...form.register("url")}
          />
          <FieldError errors={[errors.url]} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner />}
            Add link
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
