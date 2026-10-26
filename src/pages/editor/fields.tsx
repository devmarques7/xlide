import { Link2, Languages, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ImageInput } from "@/components/image-input";
import { BackgroundPicker, FontPicker } from "@/components/lyrics-controls";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ICON_NAMES, ICONS } from "@/lib/icons";
import { usePrefs } from "@/lib/prefs";
import type { TKey } from "@/lib/i18n";
import { hasLang, setLang, tx, type Layout, type Locale, type LText, type Slide, type SlideItem } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

type SlideKey = "eyebrow" | "title" | "subtitle" | "body" | "cta" | "notes";
type ItemKey = "label" | "value" | "text" | "meta";

interface FieldDef {
  key: SlideKey | "image" | "images" | "bg" | "font";
  label: TKey;
  multiline?: boolean;
}

/** Which fields each layout uses, in editing order. */
export const LAYOUT_FIELDS: Record<Layout, { fields: FieldDef[]; items?: (ItemKey | "icon" | "image")[] }> = {
  aura: {
    fields: [
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "subtitle", label: "editor.fields.subtitle", multiline: true },
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "cta", label: "editor.fields.meta" },
      { key: "body", label: "editor.fields.footnote", multiline: true },
    ],
  },
  cover: {
    fields: [
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "body", label: "editor.fields.body", multiline: true },
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "subtitle", label: "editor.fields.subtitle", multiline: true },
      { key: "cta", label: "editor.fields.meta" },
      { key: "image", label: "editor.fields.image" },
    ],
  },
  stats: {
    fields: [
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "body", label: "editor.fields.body", multiline: true },
      { key: "cta", label: "editor.fields.cta" },
    ],
    items: ["icon", "value", "label"],
  },
  services: {
    fields: [
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "cta", label: "editor.fields.cta" },
    ],
    items: ["label", "text", "meta", "value", "image"],
  },
  gallery: {
    fields: [
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "body", label: "editor.fields.body", multiline: true },
      { key: "eyebrow", label: "editor.fields.eyebrow" },
    ],
    items: ["label", "meta", "value", "image"],
  },
  split: {
    fields: [
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "subtitle", label: "editor.fields.subtitle" },
      { key: "title", label: "editor.fields.title", multiline: true },
    ],
    items: ["label", "text"],
  },
  statement: {
    fields: [
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "subtitle", label: "editor.fields.subtitle" },
      { key: "body", label: "editor.fields.body", multiline: true },
      { key: "image", label: "editor.fields.image" },
    ],
  },
  contact: {
    fields: [
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "subtitle", label: "editor.fields.subtitle" },
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "cta", label: "editor.fields.cta" },
    ],
    items: ["label", "text"],
  },
  image: {
    fields: [
      { key: "image", label: "editor.fields.image" },
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "subtitle", label: "editor.fields.subtitle" },
      { key: "body", label: "editor.fields.body", multiline: true },
    ],
  },
  chapter: {
    fields: [
      { key: "eyebrow", label: "editor.fields.chapterNumber" },
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "body", label: "editor.fields.body", multiline: true },
    ],
    items: ["value", "label"],
  },
  questions: {
    fields: [
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "subtitle", label: "editor.fields.columns" },
      { key: "images", label: "editor.fields.imageSlots" },
      { key: "cta", label: "editor.fields.footnote" },
    ],
    items: ["value", "label", "text", "meta"],
  },
  reel: {
    fields: [
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "subtitle", label: "editor.fields.subtitle", multiline: true },
      { key: "body", label: "editor.fields.body", multiline: true },
      { key: "images", label: "editor.fields.imageSlots" },
    ],
  },
  moodboard: {
    fields: [
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "subtitle", label: "editor.fields.subtitle" },
      { key: "body", label: "editor.fields.body", multiline: true },
      { key: "images", label: "editor.fields.imageSlots" },
    ],
  },
  lyrics: {
    fields: [
      { key: "title", label: "editor.fields.lyricLines", multiline: true },
      { key: "subtitle", label: "editor.fields.translation", multiline: true },
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "cta", label: "editor.fields.footnote" },
      { key: "font", label: "editor.fields.font" },
      { key: "bg", label: "editor.fields.bg" },
    ],
  },
  "pitch-cover": {
    fields: [
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "body", label: "editor.fields.body", multiline: true },
      { key: "subtitle", label: "editor.fields.subtitle", multiline: true },
      { key: "eyebrow", label: "editor.fields.eyebrow" },
      { key: "image", label: "editor.fields.image" },
    ],
  },
  "pitch-statement": {
    fields: [
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "subtitle", label: "editor.fields.subtitle", multiline: true },
      { key: "body", label: "editor.fields.body", multiline: true },
      { key: "cta", label: "editor.fields.footnote" },
    ],
  },
  "pitch-numbers": {
    fields: [
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "cta", label: "editor.fields.footnote" },
    ],
    items: ["value", "text"],
  },
  "pitch-feature": {
    fields: [
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "subtitle", label: "editor.fields.subtitle", multiline: true },
      { key: "image", label: "editor.fields.image" },
      { key: "images", label: "editor.fields.images" },
      { key: "cta", label: "editor.fields.footnote" },
    ],
    items: ["value", "label"],
  },
  "pitch-toc": {
    fields: [{ key: "title", label: "editor.fields.title", multiline: true }],
    items: ["label"],
  },
  "pitch-split": {
    fields: [
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "subtitle", label: "editor.fields.subtitle", multiline: true },
      { key: "image", label: "editor.fields.image" },
      { key: "cta", label: "editor.fields.footnote" },
    ],
    items: ["value", "text"],
  },
  "pitch-team": {
    fields: [
      { key: "title", label: "editor.fields.title", multiline: true },
      { key: "subtitle", label: "editor.fields.subtitle", multiline: true },
      { key: "cta", label: "editor.fields.footnote" },
    ],
    items: ["image", "label", "text"],
  },
};

/**
 * Localised text input. A plain string is shared by every language; an object
 * holds one translation per language. The user can switch between both.
 */
export function LTextField({
  label,
  value,
  onChange,
  lang,
  languages,
  fallback,
  multiline,
  compact,
}: {
  label: string;
  value: LText | undefined;
  onChange: (v: LText | undefined) => void;
  lang: Locale;
  languages: Locale[];
  fallback: Locale;
  multiline?: boolean;
  compact?: boolean;
}) {
  const { t } = usePrefs();
  const shared = typeof value === "string" && value !== "";
  const current = typeof value === "string" ? value : value?.[lang] ?? "";
  const fb = !shared && !hasLang(value, lang) ? tx(value, fallback) : "";
  const multi = languages.length > 1;

  const set = (text: string) => onChange(shared ? text : setLang(value, lang, text));
  const Comp = multiline ? Textarea : Input;

  return (
    <div className={cn("flex flex-col gap-1.5", compact && "gap-1")}>
      <div className="flex min-h-6 items-center gap-2">
        <Label className="flex-1">{label}</Label>
        {multi && fb && <span className="label-xs rounded bg-muted px-1.5 text-[0.6rem] text-muted-foreground">{t("editor.missing", { lang: lang.toUpperCase() })}</span>}
        {multi && (shared || current) && (
          <button
            type="button"
            title={shared ? t("editor.translateSeparately") : t("editor.shareText")}
            aria-label={shared ? t("editor.translateSeparately") : t("editor.shareText")}
            className={cn("grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground", shared && "text-foreground")}
            onClick={() => {
              if (shared) onChange(Object.fromEntries(languages.map((l) => [l, value as string])));
              else onChange(current);
            }}
          >
            {shared ? <Link2 className="size-3.5" /> : <Languages className="size-3.5" />}
          </button>
        )}
      </div>
      <Comp
        value={current}
        onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => set(e.target.value)}
        placeholder={fb || undefined}
        rows={multiline ? 3 : undefined}
        className={cn(compact && "h-9", multiline && "min-h-16 resize-y")}
      />
    </div>
  );
}

export function SlideContentForm({
  slide,
  lang,
  languages,
  fallback,
  onChange,
  onApplyAll,
}: {
  slide: Slide;
  lang: Locale;
  languages: Locale[];
  fallback: Locale;
  onChange: (patch: Partial<Slide>) => void;
  /** Copies a field to every slide of the same layout (lyrics background and font). */
  onApplyAll?: (patch: Partial<Slide>) => void;
}) {
  const { t } = usePrefs();
  const def = LAYOUT_FIELDS[slide.layout];
  const common = { lang, languages, fallback };
  // Lyrics look (background, font) is one choice for the whole song unless unticked.
  const [everywhere, setEverywhere] = useState(true);
  const setLook = (patch: Partial<Slide>) => (everywhere && onApplyAll ? onApplyAll(patch) : onChange(patch));
  const everywhereBox = onApplyAll && (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <input type="checkbox" checked={everywhere} onChange={(e) => setEverywhere(e.target.checked)} className="accent-foreground" />
      {t("bg.applyAll")}
    </label>
  );

  const setItem = (id: string, patch: Partial<SlideItem>) =>
    onChange({ items: (slide.items ?? []).map((it) => (it.id === id ? { ...it, ...patch } : it)) });

  return (
    <div className="flex flex-col gap-4">
      {slide.layout.startsWith("pitch-") && <p className="text-xs text-muted-foreground">{t("editor.highlightHint")}</p>}
      {def.fields.map((f) =>
        f.key === "images" ? (
          <div key="images" className="flex flex-col gap-1.5">
            <Label>{t(f.label)}</Label>
            {/* One input per slot; an emptied slot stays as a placeholder until removed. */}
            {(slide.images ?? []).map((src, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="label-xs w-5 shrink-0 text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <ImageInput
                    compact
                    value={src || undefined}
                    onChange={(url) => onChange({ images: slide.images!.map((x, j) => (j === i ? url ?? "" : x)) })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("editor.removeSlot")}
                  title={t("editor.removeSlot")}
                  onClick={() => onChange({ images: slide.images!.filter((_, j) => j !== i) })}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => onChange({ images: [...(slide.images ?? []), ""] })}>
              <Plus /> {t("editor.addSlot")}
            </Button>
          </div>
        ) : f.key === "bg" ? (
          <div key="bg" className="flex flex-col gap-1.5">
            <Label>{t(f.label)}</Label>
            {everywhereBox}
            <BackgroundPicker value={slide.bg} onChange={(bg) => setLook({ bg })} />
          </div>
        ) : f.key === "font" ? (
          <div key="font" className="flex flex-col gap-1.5">
            <Label>{t(f.label)}</Label>
            {everywhereBox}
            <FontPicker value={slide.font} onChange={(font) => setLook({ font })} />
          </div>
        ) : f.key === "image" ? (
          <div key="image" className="flex flex-col gap-1.5">
            <Label>{t(f.label)}</Label>
            <ImageInput value={slide.image} onChange={(image) => onChange({ image })} />
          </div>
        ) : (
          <LTextField
            key={f.key}
            label={t(f.label)}
            value={slide[f.key]}
            multiline={f.multiline}
            onChange={(v) => onChange({ [f.key]: v })}
            {...common}
          />
        ),
      )}

      {def.items && (
        <div className="flex flex-col gap-3">
          <Label>{t("editor.fields.items")}</Label>
          {(slide.items ?? []).map((it, i) => (
            <div key={it.id} className="flex flex-col gap-3 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="label-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("editor.removeItem")}
                  onClick={() => onChange({ items: slide.items!.filter((x) => x.id !== it.id) })}
                >
                  <Trash2 />
                </Button>
              </div>
              {def.items!.map((k) => {
                if (k === "icon") {
                  return (
                    <div key={k} className="flex flex-col gap-1.5">
                      <Label>{t("editor.fields.icon")}</Label>
                      <div className="flex flex-wrap gap-1">
                        <IconChoice active={!it.icon} onClick={() => setItem(it.id, { icon: undefined })} name="—" />
                        {ICON_NAMES.map((n) => (
                          <IconChoice key={n} name={n} active={it.icon === n} onClick={() => setItem(it.id, { icon: n })} />
                        ))}
                      </div>
                    </div>
                  );
                }
                if (k === "image") {
                  return (
                    <div key={k} className="flex flex-col gap-1">
                      <Label>{t("editor.fields.image")}</Label>
                      <ImageInput compact value={it.image} onChange={(image) => setItem(it.id, { image })} />
                    </div>
                  );
                }
                return (
                  <LTextField
                    key={k}
                    compact
                    label={t(`editor.fields.${k}`)}
                    value={it[k]}
                    multiline={k === "text" || (k === "label" && slide.layout === "services")}
                    onChange={(v) => setItem(it.id, { [k]: v })}
                    {...common}
                  />
                );
              })}
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => onChange({ items: [...(slide.items ?? []), { id: uid("i_") }] })}
          >
            <Plus /> {t("editor.addItem")}
          </Button>
        </div>
      )}

      <LTextField label={t("editor.fields.notes")} value={slide.notes} multiline onChange={(v) => onChange({ notes: v })} {...common} />
    </div>
  );
}

function IconChoice({ name, active, onClick }: { name: string; active: boolean; onClick: () => void }) {
  const Icon = ICONS[name];
  return (
    <button
      type="button"
      title={name}
      aria-label={name}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-md border border-border text-xs text-muted-foreground transition-colors hover:text-foreground",
        active && "border-foreground bg-foreground text-background hover:text-background",
      )}
    >
      {Icon ? <Icon className="size-4" /> : name}
    </button>
  );
}
