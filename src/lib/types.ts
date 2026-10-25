export const LOCALES = ["en", "pt", "nl"] as const;
export type Locale = (typeof LOCALES)[number];

/** A text value: plain string (same for every language) or one per language. */
export type LText = string | Partial<Record<Locale, string>>;

export const EDITORIAL_LAYOUTS = ["aura", "cover", "stats", "services", "gallery", "split", "statement", "contact", "image", "chapter", "questions", "reel"] as const;
export const PITCH_LAYOUTS = ["pitch-cover", "pitch-statement", "pitch-numbers", "pitch-feature", "pitch-toc", "pitch-split", "pitch-team"] as const;
export const LAYOUTS = [...EDITORIAL_LAYOUTS, ...PITCH_LAYOUTS] as const;

export const TEMPLATES = ["editorial", "pitch"] as const;
export type Template = (typeof TEMPLATES)[number];

/** Slide background: paper, ink, or the deck's attention colour. */
export const TONES = ["light", "dark", "accent"] as const;
export type Tone = (typeof TONES)[number];

/** Layout variants (image arrangement). */
export const VARIANTS: Partial<Record<string, readonly string[]>> = {
  cover: ["band", "full", "dim"],
  "pitch-feature": ["side", "collage", "row"],
  "pitch-split": ["left", "right"],
};

export const ACCENT_PRESETS = [
  { name: "Cobalt", value: "#1F4BD8" },
  { name: "Signal", value: "#E5322D" },
  { name: "Orange", value: "#FF5A1F" },
  { name: "Lime", value: "#B7E21E" },
  { name: "Forest", value: "#1E7A4C" },
  { name: "Violet", value: "#6A3DF0" },
  { name: "Ink", value: "#161615" },
] as const;
export const DEFAULT_ACCENT = "#1F4BD8";
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
  /** Extra images for collage/row layouts. */
  images?: string[];
  tone?: Tone;
  variant?: string;
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
  /** Visual template; editorial is the default monochrome XLIDE look. */
  template?: Template;
  /** Attention colour (hex) used for highlights and accent-toned slides. */
  accent?: string;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
  /** When this browser added the deck (shipped decks); used only to sort Recent. */
  addedAt?: number;
}

/** Fixed edit date for decks that ship with the app: any real edit is newer. */
export const SHIPPED_AT = Date.UTC(2026, 9, 17);

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
