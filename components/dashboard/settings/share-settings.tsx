"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const QR_OPTIONS = { errorCorrectionLevel: "M", margin: 2, color: { dark: "#111111", light: "#ffffff" } } as const;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / non-secure contexts.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export function ShareSettings({ siteUrl }: { siteUrl: string }) {
  const { profile } = useDashboard();
  const publicUrl = `${siteUrl}/${profile.username}`;
  const [qr, setQr] = useState<{ url: string; svg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(publicUrl, { ...QR_OPTIONS, type: "svg" }).then((svg) => {
      if (!cancelled) setQr({ url: publicUrl, svg });
    });
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  async function onCopy() {
    if (await copyText(publicUrl)) {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  async function downloadPng() {
    const dataUrl = await QRCode.toDataURL(publicUrl, { ...QR_OPTIONS, width: 1024 });
    download(dataUrl, `linkhub-${profile.username}-qr.png`);
  }

  function downloadSvg() {
    if (!qr) return;
    const blobUrl = URL.createObjectURL(new Blob([qr.svg], { type: "image/svg+xml" }));
    download(blobUrl, `linkhub-${profile.username}-qr.svg`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  const ready = qr?.url === publicUrl;

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="public-url">Your public link</Label>
        <div className="flex gap-2">
          <Input id="public-url" value={publicUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
          <Button type="button" variant="outline" onClick={onCopy} className="shrink-0">
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Paste it into your Instagram, TikTok or X bio.</p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {ready ? (
          <div
            role="img"
            aria-label={`QR code linking to ${publicUrl}`}
            className="size-40 overflow-hidden rounded-xl border bg-white [&>svg]:size-full"
            // SVG generated locally by the qrcode library from our own URL.
            dangerouslySetInnerHTML={{ __html: qr.svg }}
          />
        ) : (
          <Skeleton className="size-40 rounded-xl" />
        )}
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={downloadPng} disabled={!ready}>
            <Download aria-hidden />
            PNG
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={downloadSvg} disabled={!ready}>
            <Download aria-hidden />
            SVG
          </Button>
        </div>
      </div>
    </div>
  );
}
