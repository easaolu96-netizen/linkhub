import type { Area } from "react-easy-crop";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't read that image"));
    image.src = src;
  });
}

/**
 * Crop `area` out of the image and scale it to a `size`×`size` square.
 * Saved as JPEG: tiny at 512px, and universally supported (including by the
 * Open Graph image renderer, which can't read WebP).
 */
export async function cropToSquare(src: string, area: Area, size = 512) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images");

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));

  // JPEG has no transparency: paint a white backdrop for transparent PNGs.
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const jpeg = await toBlob("image/jpeg");
  if (jpeg) return { blob: jpeg, extension: "jpg" as const };
  throw new Error("Couldn't process that image");
}
