import { hasLang, LAYOUTS, tx, type Layout, type Locale, type LText, type Presentation, type Slide } from "./types";

/** Comfortable word budget per layout before a slide feels crowded. */
const CAPACITY: Record<Layout, number> = {
  cover: 25,
  stats: 70,
  services: 90,
  gallery: 50,
  split: 110,
  statement: 35,
  contact: 45,
  image: 18,
};

const WPM = 130;

export type IssueKind = "noTitle" | "longTitle" | "tooDense" | "missingLang" | "noNotes" | "longSentence";
export interface Issue {
  kind: IssueKind;
  severity: "info" | "warn";
  slideIndex: number;
  vars?: Record<string, string | number>;
}

/** All visible text fields of a slide, with a label for reports. */
export function slideFields(s: Slide): { name: string; value: LText | undefined }[] {
  const out: { name: string; value: LText | undefined }[] = [
    { name: "eyebrow", value: s.eyebrow },
    { name: "title", value: s.title },
    { name: "subtitle", value: s.subtitle },
    { name: "body", value: s.body },
    { name: "cta", value: s.cta },
  ];
  s.items?.forEach((it, i) => {
    out.push({ name: `item ${i + 1}`, value: it.label }, { name: `item ${i + 1}`, value: it.text });
    out.push({ name: `item ${i + 1}`, value: it.value }, { name: `item ${i + 1}`, value: it.meta });
  });
  return out.filter((f) => f.value != null && (typeof f.value === "string" ? f.value : Object.values(f.value).some(Boolean)));
}

function words(s: string) {
  return s.split(/\s+/).filter((w) => /\w/.test(w)).length;
}

export function slideText(s: Slide, lang: Locale, fallback: Locale) {
  return slideFields(s)
    .map((f) => tx(f.value, lang, fallback))
    .join(" ");
}

export function analyzeSlide(s: Slide, index: number, deck: Presentation, lang: Locale) {
  const fb = deck.defaultLanguage;
  const text = slideText(s, lang, fb);
  const wordCount = words(text);
  const seconds = Math.max(8, Math.round((wordCount / WPM) * 60) + 6);
  const density = wordCount / CAPACITY[s.layout];
  const issues: Issue[] = [];

  const title = tx(s.title, lang, fb).replace(/\n/g, " ");
  if (!title && ["cover", "stats", "gallery", "statement", "contact"].includes(s.layout)) {
    issues.push({ kind: "noTitle", severity: "warn", slideIndex: index });
  }
  if (title.length > 40) issues.push({ kind: "longTitle", severity: "warn", slideIndex: index, vars: { n: title.length } });
  if (density > 1.15) issues.push({ kind: "tooDense", severity: "warn", slideIndex: index, vars: { n: wordCount } });

  const sentences = text.split(/[.!?]+/).map((x) => words(x)).filter((n) => n > 0);
  const avg = sentences.length ? sentences.reduce((a, b) => a + b, 0) / sentences.length : 0;
  if (avg > 24) issues.push({ kind: "longSentence", severity: "info", slideIndex: index, vars: { n: Math.round(avg) } });

  const coverage: Partial<Record<Locale, number>> = {};
  const fields = slideFields(s).filter((f) => typeof f.value !== "string");
  for (const l of deck.languages) {
    const missing = fields.filter((f) => !hasLang(f.value, l));
    coverage[l] = fields.length ? (fields.length - missing.length) / fields.length : 1;
    if (missing.length) {
      issues.push({
        kind: "missingLang",
        severity: "warn",
        slideIndex: index,
        vars: { lang: l.toUpperCase(), fields: [...new Set(missing.map((m) => m.name))].join(", ") },
      });
    }
  }
  if (!s.notes || !deck.languages.some((l) => hasLang(s.notes, l))) {
    issues.push({ kind: "noNotes", severity: "info", slideIndex: index });
  }

  return { wordCount, seconds, density, coverage, issues };
}

export function analyzeDeck(deck: Presentation, lang: Locale) {
  const slides = deck.slides.map((s, i) => analyzeSlide(s, i, deck, lang));
  const seconds = slides.reduce((a, s) => a + s.seconds, 0);
  const wordCount = slides.reduce((a, s) => a + s.wordCount, 0);
  const coverage = Object.fromEntries(
    deck.languages.map((l) => [l, slides.length ? slides.reduce((a, s) => a + (s.coverage[l] ?? 1), 0) / slides.length : 1]),
  ) as Partial<Record<Locale, number>>;
  const layouts = Object.fromEntries(LAYOUTS.map((l) => [l, deck.slides.filter((s) => s.layout === l).length])) as Record<Layout, number>;
  const issues = slides.flatMap((s) => s.issues);
  return { slides, seconds, wordCount, coverage, layouts, issues };
}

export function formatDuration(seconds: number, t: (k: "analysis.min" | "analysis.sec", v: Record<string, number>) => string) {
  return seconds >= 60 ? t("analysis.min", { n: Math.round(seconds / 6) / 10 }) : t("analysis.sec", { n: seconds });
}
