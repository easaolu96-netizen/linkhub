"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { deleteLink, updateLink } from "@/lib/actions/links";
import type { DashboardLink } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LINK_TITLE_MAX, linkInputSchema } from "@/lib/validation/link";

function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/^mailto:/, "");
}

export function LinkCard({ link }: { link: DashboardLink }) {
  const { links, setLinks } = useDashboard();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: link.title, url: link.url });
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});
  const [isSaving, startSaving] = useTransition();

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id });

  /** Optimistically patch this link; roll back if the server rejects it. */
  async function patch(changes: Partial<Pick<DashboardLink, "title" | "url" | "is_visible">>) {
    const previous = link;
    setLinks((current) => current.map((l) => (l.id === link.id ? { ...l, ...changes } : l)));
    const result = await updateLink({ id: link.id, ...changes });
    if (!result.ok) {
      setLinks((current) => current.map((l) => (l.id === link.id ? previous : l)));
      toast.error(result.error);
      return false;
    }
    setLinks((current) => current.map((l) => (l.id === link.id ? { ...result.data, clicks: l.clicks } : l)));
    return true;
  }

  function startEditing() {
    setDraft({ title: link.title, url: link.url });
    setErrors({});
    setEditing(true);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = linkInputSchema.safeParse(draft);
    if (!parsed.success) {
      const fieldErrors: { title?: string; url?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "title" || key === "url") && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    startSaving(async () => {
      if (await patch(parsed.data)) {
        setEditing(false);
        toast.success("Link updated");
      }
    });
  }

  async function remove() {
    const removedIndex = links.findIndex((l) => l.id === link.id);
    setLinks((current) => current.filter((l) => l.id !== link.id));
    const result = await deleteLink(link.id);
    if (!result.ok) {
      setLinks((current) => {
        const next = [...current];
        next.splice(Math.max(removedIndex, 0), 0, link);
        return next;
      });
      toast.error(result.error);
      return;
    }
    toast.success("Link deleted");
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 rounded-xl border bg-surface py-3 pr-3 pl-1 sm:pr-4",
        isDragging && "relative z-10 shadow-[0_12px_30px_-12px_rgba(27,26,23,0.35)] ring-1 ring-ink/20",
        !link.is_visible && !editing && "bg-transparent",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        aria-label={`Reorder "${link.title}"`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={save} noValidate className="flex flex-col gap-3 py-1">
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor={`title-${link.id}`}>Title</FieldLabel>
              <Input
                id={`title-${link.id}`}
                value={draft.title}
                maxLength={LINK_TITLE_MAX}
                autoFocus
                aria-invalid={Boolean(errors.title)}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
              {errors.title && <FieldError>{errors.title}</FieldError>}
            </Field>
            <Field data-invalid={Boolean(errors.url)}>
              <FieldLabel htmlFor={`url-${link.id}`}>URL</FieldLabel>
              <Input
                id={`url-${link.id}`}
                type="url"
                inputMode="url"
                value={draft.url}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(errors.url)}
                onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
              />
              {errors.url && <FieldError>{errors.url}</FieldError>}
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving && <Spinner />}
                Save
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-2 pl-1 sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className={cn("truncate font-medium", !link.is_visible && "text-muted-foreground")}>
                {link.title}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {displayUrl(link.url)}
                <span aria-hidden> · </span>
                <span className="tabular-nums">
                  {link.clicks.toLocaleString()} {link.clicks === 1 ? "click" : "clicks"}
                </span>
                {!link.is_visible && <span> · hidden</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={startEditing}
                aria-label={`Edit "${link.title}"`}
              >
                <Pencil aria-hidden />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Delete "${link.title}"`}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this link?</AlertDialogTitle>
                    <AlertDialogDescription>
                      &ldquo;{link.title}&rdquo; and its click history will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={remove}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <Switch
              checked={link.is_visible}
              onCheckedChange={(checked) => void patch({ is_visible: checked })}
              aria-label={link.is_visible ? `Hide "${link.title}"` : `Show "${link.title}"`}
              className="ml-1"
            />
          </div>
        )}
      </div>
    </li>
  );
}
