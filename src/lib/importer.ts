import { LAYOUTS, LOCALES, type Layout, type Locale, type LText, type Presentation, type Slide, type SlideItem } from "./types";
import { uid } from "./utils";

function asLText(v: unknown): LText | undefined {
  if (v == null) return undefined;
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object") {
    const out: Partial<Record<Locale, string>> = {};
    for (const l of LOCALES) {
      const x = (v as Record<string, unknown>)[l];
      if (x != null) out[l] = String(x);
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

function asItem(raw: unknown): SlideItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: uid("i_"),
    label: asLText(r.label ?? r.title),
    value: asLText(r.value),
    text: asLText(r.text ?? r.body ?? r.description),
    meta: asLText(r.meta ?? r.tag ?? r.price),
    icon: typeof r.icon === "string" ? r.icon : undefined,
    image: typeof r.image === "string" ? r.image : undefined,
  };
}

export function asSlide(raw: unknown): Slide {
  const r = (raw ?? {}) as Record<string, unknown>;
  const layout = (LAYOUTS as readonly string[]).includes(r.layout as string) ? (r.layout as Layout) : "statement";
  return {
    id: uid("s_"),
    layout,
    inverse: !!r.inverse,
    eyebrow: asLText(r.eyebrow),
    title: asLText(r.title),
    subtitle: asLText(r.subtitle),
    body: asLText(r.body ?? r.text),
    cta: asLText(r.cta),
    image: typeof r.image === "string" ? r.image : undefined,
    items: Array.isArray(r.items) ? r.items.map(asItem) : undefined,
    notes: asLText(r.notes),
  };
}

/** Plain text: "# Heading" starts a slide, following lines become the body. */
function parsePlainText(text: string): Slide[] {
  const slides: Slide[] = [];
  let cur: { title: string; body: string[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const body = cur.body.join("\n").trim();
    slides.push({ id: uid("s_"), layout: slides.length === 0 ? "cover" : "statement", title: cur.title, body: body || undefined });
  };
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^#{1,3}\s+(.*)$/);
    if (m) {
      flush();
      cur = { title: m[1].trim(), body: [] };
    } else if (cur) cur.body.push(line);
    else if (line.trim()) cur = { title: line.trim(), body: [] };
  }
  flush();
  return slides;
}

export interface ParsedImport {
  title?: LText;
  description?: LText;
  languages?: Locale[];
  defaultLanguage?: Locale;
  slides: Slide[];
}

export function parseImport(input: string): ParsedImport {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("empty");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    const obj = Array.isArray(data) ? { slides: data } : data;
    if (!Array.isArray(obj.slides)) throw new Error("missing “slides” array");
    const languages = Array.isArray(obj.languages)
      ? (obj.languages.filter((l: string) => (LOCALES as readonly string[]).includes(l)) as Locale[])
      : undefined;
    return {
      title: asLText(obj.title),
      description: asLText(obj.description),
      languages: languages?.length ? languages : undefined,
      defaultLanguage: (LOCALES as readonly string[]).includes(obj.defaultLanguage) ? obj.defaultLanguage : undefined,
      slides: obj.slides.map(asSlide),
    };
  }
  const slides = parsePlainText(trimmed);
  if (!slides.length) throw new Error("no slides found");
  return { slides };
}

export function presentationFromImport(p: ParsedImport, fallbackLang: Locale): Presentation {
  const languages = p.languages ?? [fallbackLang];
  return {
    id: uid("p_"),
    title: p.title ?? "Imported",
    description: p.description,
    languages,
    defaultLanguage: p.defaultLanguage ?? languages[0],
    slides: p.slides,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Clean JSON for export (drops internal ids). */
export function exportPresentation(p: Presentation) {
  const strip = <T extends { id?: string }>(o: T) => {
    const { id: _id, ...rest } = o;
    return rest;
  };
  return {
    title: p.title,
    description: p.description,
    author: p.author,
    tags: p.tags,
    languages: p.languages,
    defaultLanguage: p.defaultLanguage,
    slides: p.slides.map((s) => ({ ...strip(s), items: s.items?.map(strip) })),
  };
}

export function blankSlide(layout: Layout): Slide {
  const base: Slide = { id: uid("s_"), layout, title: "" };
  if (["stats"].includes(layout)) base.items = [0, 1, 2, 3].map(() => ({ id: uid("i_"), value: "", label: "" }));
  if (["services", "gallery", "split", "contact"].includes(layout))
    base.items = [0, 1].map(() => ({ id: uid("i_"), label: "", text: "" }));
  return base;
}
