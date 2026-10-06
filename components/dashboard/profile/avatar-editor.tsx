"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import Cropper, { type Area } from "react-easy-crop";
import { ImageUp, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { removeAvatar, setAvatar } from "@/lib/actions/profile";
import { cropToSquare } from "@/lib/crop-image";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function AvatarEditor() {
  const { profile, setProfile } = useDashboard();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeCropper() {
    if (source) URL.revokeObjectURL(source);
    setSource(null);
  }

  function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That image is over 2 MB. Please choose a smaller one.");
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSource(URL.createObjectURL(file));
  }

  function saveCrop() {
    if (!source || !area) return;
    startTransition(async () => {
      try {
        const { blob, extension } = await cropToSquare(source, area);
        const path = `${profile.id}/${Date.now()}.${extension}`;
        const supabase = createClient();
        const { error } = await supabase.storage.from("avatars").upload(path, blob, {
          contentType: blob.type,
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw new Error("Upload failed. Please try again.");

        const result = await setAvatar(path);
        if (!result.ok) throw new Error(result.error);
        setProfile((p) => ({ ...p, avatar_url: result.data.avatar_url }));
        toast.success(result.message ?? "Avatar updated");
        closeCropper();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const previous = profile.avatar_url;
      setProfile((p) => ({ ...p, avatar_url: null }));
      const result = await removeAvatar();
      if (!result.ok) {
        setProfile((p) => ({ ...p, avatar_url: previous }));
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Avatar removed");
    });
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="Your avatar" fill unoptimized className="object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-2xl font-semibold text-muted-foreground">
            {(profile.display_name || profile.username).slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 sm:items-start">
        <div className="flex gap-2">
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={isPending}>
            {isPending && !source ? <Spinner /> : <ImageUp aria-hidden />}
            {profile.avatar_url ? "Change photo" : "Upload photo"}
          </Button>
          {profile.avatar_url && (
            <Button type="button" variant="outline" onClick={remove} disabled={isPending}>
              <Trash2 aria-hidden />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP · max 2 MB · cropped to a square</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose an avatar image"
          onChange={onFileChosen}
        />
      </div>

      <Dialog open={source !== null} onOpenChange={(open) => !open && !isPending && closeCropper()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop your photo</DialogTitle>
            <DialogDescription>Drag to position and use the slider to zoom.</DialogDescription>
          </DialogHeader>
          <div className="relative h-72 overflow-hidden rounded-lg bg-zinc-900">
            {source && (
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <ZoomOut className="size-4 text-muted-foreground" aria-hidden />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={([value]) => setZoom(value ?? 1)}
              aria-label="Zoom"
            />
            <ZoomIn className="size-4 text-muted-foreground" aria-hidden />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCropper} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={saveCrop} disabled={isPending || !area}>
              {isPending && <Spinner />}
              Save photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
