import { useEffect } from "react";
import { fontCssUrl, moodFonts } from "../../shared/brand.js";
import type { MoodItem } from "../../shared/board.js";

const loaded = new Set<string>();

/** Adds the stylesheet for a family once; a weight the family lacks falls back to its default style. */
function ensure(family: string, weights: number[]) {
  const key = `${family}|${weights.join(",")}`;
  if (loaded.has(key)) return;
  loaded.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = fontCssUrl(family, weights).url;
  link.onerror = () => {
    link.remove();
    const plain = document.createElement("link");
    plain.rel = "stylesheet";
    plain.href = fontCssUrl(family).url;
    document.head.appendChild(plain);
  };
  document.head.appendChild(link);
}

/** Loads every brand font used on the moodboard (Google Fonts / Fontshare). */
export function useBrandFonts(items: MoodItem[]) {
  const key = moodFonts(items).map((f) => `${f.family}:${f.weights.join(",")}`).join("|");
  useEffect(() => {
    if (!key) return;
    for (const part of key.split("|")) {
      const [family, w] = part.split(":");
      ensure(family!, w!.split(",").map(Number));
    }
  }, [key]);
}

export const fontStack = (family?: string) => (family ? `'${family}', var(--font-sans, sans-serif)` : undefined);
