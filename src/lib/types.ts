export const LOCALES = ["en", "pt", "nl"] as const;
export type Locale = (typeof LOCALES)[number];

/** A text value: plain string (same for every language) or one per language. */
export type LText = string | Partial<Record<Locale, string>>;

export const LAYOUTS = [
  "cover",
  "stats",
  "services",
  "gallery",
  "split",
  "statement",
  "contact",
  "image",
] as const;
export type Layout = (typeof LAYOUTS)[number];

export interface SlideItem {
  id: string;
  label?: LText;
  value?: LText;
  text?: LText;
  meta?: LText;
  icon?: string;
  image?: string;
}

export interface Slide {
  id: string;
  layout: Layout;
  inverse?: boolean;
  eyebrow?: LText;
  title?: LText;
  subtitle?: LText;
  body?: LText;
  cta?: LText;
  image?: string;
  items?: SlideItem[];
  notes?: LText;
}

export interface Presentation {
  id: string;
  title: LText;
  description?: LText;
  author?: string;
  tags?: string[];
  languages: Locale[];
  defaultLanguage: Locale;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
}

export function tx(v: LText | undefined, lang: Locale, fallback?: Locale): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] ?? (fallback ? v[fallback] : undefined) ?? Object.values(v).find(Boolean) ?? "";
}

/** True when the value has its own text for `lang` (not a fallback). */
export function hasLang(v: LText | undefined, lang: Locale): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return !!v[lang]?.trim();
}

export function setLang(v: LText | undefined, lang: Locale, text: string): LText {
  if (v == null || typeof v === "string") return { [lang]: text };
  return { ...v, [lang]: text };
}

export function allText(v: LText | undefined): string {
  if (v == null) return "";
  return typeof v === "string" ? v : Object.values(v).join(" ");
}
