import type { Slide } from "./types";

const MAX_SIDE = 1920;

/** Resize to at most 1920px and re-encode as JPEG (keeps uploads small). */
export async function compress(file: File, maxSide = MAX_SIDE): Promise<{ data: string; type: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const keepAlpha = file.type === "image/png" && file.size < 600_000;
  const type = keepAlpha ? "image/png" : "image/jpeg";
  const url = canvas.toDataURL(type, 0.82);
  return { data: url.slice(url.indexOf(",") + 1), type };
}

export interface UploadResult {
  url: string;
  /** False when the server was unavailable and the image only lives in this browser. */
  shared: boolean;
}

/** Uploads to the XLIDE server so every device can load it; falls back to a data URL. */
export async function uploadImage(file: File): Promise<UploadResult> {
  const { data, type } = await compress(file);
  try {
    const res = await fetch("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, type }),
    });
    if (res.ok) return { url: (await res.json()).url, shared: true };
  } catch {
    /* offline / static host */
  }
  return { url: `data:${type};base64,${data}`, shared: false };
}

const base = (s: string) => s.split(/[\\/]/).pop()!.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
const LAYOUTS_WITH_IMAGE = new Set(["cover", "image", "pitch-cover", "pitch-feature", "pitch-split"]);

/**
 * Bulk import: link files to slides. First by file name (slide02.jpg replaces
 * a slide whose image is …/slide02.jpg), then by the number in the name
 * (slide02 / 02 → slide 2) for slides whose layout shows an image.
 */
export function matchImages(slides: Slide[], files: File[]) {
  const byFile = new Map<File, number>();
  for (const f of files) {
    const name = base(f.name);
    let i = slides.findIndex((s) => s.image && !s.image.startsWith("data:") && base(s.image) === name);
    if (i < 0) {
      const n = Number(name.match(/(\d+)(?!.*\d)/)?.[1]);
      if (n >= 1 && n <= slides.length && LAYOUTS_WITH_IMAGE.has(slides[n - 1].layout)) i = n - 1;
    }
    if (i >= 0) byFile.set(f, i);
  }
  return byFile;
}
