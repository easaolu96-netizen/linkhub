"use client";

import { useId, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { AddLinkForm } from "@/components/dashboard/links/add-link-form";
import { LinkCard } from "@/components/dashboard/links/link-card";
import { Button } from "@/components/ui/button";
import { reorderLinks } from "@/lib/actions/links";

export function LinksEditor() {
  const { links, setLinks } = useDashboard();
  const [adding, setAdding] = useState(false);
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const previous = links;
    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(links, oldIndex, newIndex);
    setLinks(reordered);
    const result = await reorderLinks(reordered.map((l) => l.id));
    if (!result.ok) {
      setLinks(previous);
      toast.error(result.error);
    }
  }

  function titleOf(id: string | number) {
    return links.find((l) => l.id === id)?.title ?? "link";
  }

  return (
    <div className="flex flex-col gap-4">
      {adding ? (
        <AddLinkForm onDone={() => setAdding(false)} />
      ) : (
        <Button size="lg" className="h-12 w-full rounded-xl text-[15px]" onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          Add link
        </Button>
      )}

      {links.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-input px-6 py-14 text-center">
          <h2 className="font-display text-3xl">Add your first link</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            Your website, socials, latest video — anything. You can reorder them any time.
          </p>
        </div>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
          accessibility={{
            announcements: {
              onDragStart: ({ active }) => `Picked up "${titleOf(active.id)}".`,
              onDragOver: ({ active, over }) =>
                over
                  ? `"${titleOf(active.id)}" moved to position ${links.findIndex((l) => l.id === over.id) + 1} of ${links.length}.`
                  : `"${titleOf(active.id)}" is no longer over a position.`,
              onDragEnd: ({ active, over }) =>
                over
                  ? `"${titleOf(active.id)}" dropped at position ${links.findIndex((l) => l.id === over.id) + 1}.`
                  : `"${titleOf(active.id)}" dropped.`,
              onDragCancel: ({ active }) => `Reordering cancelled. "${titleOf(active.id)}" returned.`,
            },
          }}
        >
          <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-3" aria-label="Your links">
              {links.map((link) => (
                <LinkCard key={link.id} link={link} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
