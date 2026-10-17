import { AlertTriangle, Check, Copy, Download, Info } from "lucide-react";
import { toast } from "sonner";
import { ImportPanel } from "@/components/import-panel";
import { TemplateJson } from "@/components/template-json";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { analyzeDeck, formatDuration, type Issue } from "@/lib/analysis";
import { LOCALE_SHORT, type TKey } from "@/lib/i18n";
import { exportPresentation, presentationFromImport } from "@/lib/importer";
import { usePrefs } from "@/lib/prefs";
import { savePresentation } from "@/lib/store";
import { ACCENT_PRESETS, DEFAULT_ACCENT, EDITORIAL_LAYOUTS, LAYOUTS, LOCALES, PITCH_LAYOUTS, TEMPLATES, TONES, tx, VARIANTS, type Locale, type Presentation, type Slide, type Template } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SlideFrame } from "@/slides/SlideView";
import { LTextField } from "./fields";

/* ───────── Design ───────── */

export function DesignPanel({ slide, lang, fallback, template, onChange }: { slide: Slide; lang: Locale; fallback: Locale; template: Template; onChange: (p: Partial<Slide>) => void }) {
  const { t } = usePrefs();
  const groups = template === "pitch" ? [PITCH_LAYOUTS, EDITORIAL_LAYOUTS] : [EDITORIAL_LAYOUTS, PITCH_LAYOUTS];
  const variants = VARIANTS[slide.layout];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label>{t("editor.tone")}</Label>
        <Segmented
          value={slide.tone ?? "auto"}
          options={["auto", ...TONES].map((v) => ({ value: v, label: t(`tone.${v}` as TKey) }))}
          onChange={(v) => onChange({ tone: v === "auto" ? undefined : (v as Slide["tone"]) })}
        />
      </div>
      {variants && (
        <div className="flex flex-col gap-2">
          <Label>{t("editor.variant")}</Label>
          <Segmented
            value={slide.variant ?? variants[0]}
            options={variants.map((v) => ({ value: v, label: t(`variant.${v}` as TKey) }))}
            onChange={(v) => onChange({ variant: v })}
          />
        </div>
      )}
      <Separator />
      {groups.map((group) => (
        <div key={group[0]} className="flex flex-col gap-2">
          <Label>
            {t("editor.layout")} · {t(group === PITCH_LAYOUTS ? "template.pitch" : "template.editorial")}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {group.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onChange({ layout: l })}
                aria-pressed={slide.layout === l}
                className="group flex flex-col gap-1.5 text-left"
              >
                <SlideFrame
                  slide={{ ...slide, layout: l }}
                  lang={lang}
                  fallback={fallback}
                  className={cn("pointer-events-none transition-shadow", slide.layout === l ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "group-hover:border-foreground/40")}
                />
                <span className={cn("label-xs", slide.layout === l ? "text-foreground" : "text-muted-foreground")}>{t(`layout.${l}`)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {!slide.layout.startsWith("pitch-") && (
        <>
          <Separator />
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">{t("editor.inverse")}</span>
              <span className="block text-xs text-muted-foreground">{t("editor.inverseHint")}</span>
            </span>
            <Switch checked={!!slide.inverse} onCheckedChange={(v) => onChange({ inverse: v })} />
          </label>
        </>
      )}
    </div>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 bg-muted p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("flex-1 px-2 py-1.5 text-xs font-medium", value === o.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Attention colour: presets plus a free colour picker. */
function AccentPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = usePrefs();
  return (
    <div className="flex flex-col gap-2">
      <Label>{t("editor.accent")}</Label>
      <div className="flex flex-wrap gap-1.5">
        {ACCENT_PRESETS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.name}
            aria-label={c.name}
            aria-pressed={value.toLowerCase() === c.value.toLowerCase()}
            onClick={() => onChange(c.value)}
            className={cn("size-9 border border-border outline-offset-2", value.toLowerCase() === c.value.toLowerCase() && "outline-2 outline-foreground")}
            style={{ background: c.value }}
          />
        ))}
        <label className="relative flex h-9 items-center gap-2 border border-border px-2 text-xs" title={t("editor.customColor")}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-6 cursor-pointer border-0 bg-transparent p-0" />
          <span className="font-mono uppercase">{value}</span>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t("editor.accentHint")} {t("editor.highlightHint")}</p>
    </div>
  );
}

/* ───────── Analysis ───────── */

function Meter({ value, label, sub }: { value: number; label: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="label-xs text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums">{sub ?? `${Math.round(value * 100)}%`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col justify-between gap-4 border-border p-3 not-last:border-r">
      <span className="label-xs text-muted-foreground">{label}</span>
      <span className="text-3xl font-medium tracking-tight tabular-nums">{value}</span>
    </div>
  );
}

export function IssueList({ issues, onGo }: { issues: Issue[]; onGo?: (i: number) => void }) {
  const { t } = usePrefs();
  if (!issues.length) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
        <Check className="size-4" /> {t("analysis.noIssues")}
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {issues.map((is, k) => (
        <li key={k}>
          <button
            type="button"
            onClick={() => onGo?.(is.slideIndex)}
            className="flex w-full items-start gap-2.5 p-3 text-left text-sm hover:bg-accent disabled:hover:bg-transparent"
            disabled={!onGo}
          >
            {is.severity === "warn" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
            <span className="flex-1">{t(`analysis.${is.kind}` as TKey, is.vars)}</span>
            {onGo && <span className="label-xs shrink-0 text-muted-foreground">{t("analysis.goToSlide", { n: is.slideIndex + 1 })}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AnalysisPanel({ deck, slideIndex, lang, onGo }: { deck: Presentation; slideIndex: number; lang: Locale; onGo: (i: number) => void }) {
  const { t } = usePrefs();
  const a = analyzeDeck(deck, lang);
  const s = a.slides[slideIndex];
  const densityLabel = !s ? "" : s.density < 0.5 ? t("analysis.light") : s.density <= 1.15 ? t("analysis.balanced") : t("analysis.heavy");
  const maxLayout = Math.max(1, ...Object.values(a.layouts));

  return (
    <div className="flex flex-col gap-6">
      {s && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">
            {t("analysis.slide")} <span className="text-muted-foreground">— {String(slideIndex + 1).padStart(2, "0")}</span>
          </h3>
          <div className="grid grid-cols-2 rounded-xl border border-border">
            <Stat label={t("analysis.words")} value={s.wordCount} />
            <Stat label={t("analysis.readTime")} value={formatDuration(s.seconds, t)} />
          </div>
          <Meter label={t("analysis.density")} value={Math.min(1, s.density / 1.5)} sub={densityLabel} />
          {deck.languages.map((l) => (
            <Meter key={l} label={`${t("analysis.coverage")} · ${LOCALE_SHORT[l]}`} value={s.coverage[l] ?? 1} />
          ))}
          <IssueList issues={s.issues} />
        </section>
      )}

      <Separator />

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t("analysis.deck")}</h3>
        <div className="grid grid-cols-3 rounded-xl border border-border">
          <Stat label={t("analysis.slides")} value={deck.slides.length} />
          <Stat label={t("analysis.words")} value={a.wordCount} />
          <Stat label={t("analysis.duration")} value={formatDuration(a.seconds, t)} />
        </div>
        {deck.languages.map((l) => (
          <Meter key={l} label={`${t("analysis.coverage")} · ${LOCALE_SHORT[l]}`} value={a.coverage[l] ?? 1} />
        ))}
        <div className="flex flex-col gap-2 pt-2">
          <span className="label-xs text-muted-foreground">{t("analysis.layouts")}</span>
          {LAYOUTS.filter((l) => a.layouts[l] > 0).map((l) => (
            <div key={l} className="flex items-center gap-3 text-xs">
              <span className="w-28 truncate">{t(`layout.${l}`)}</span>
              <div className="h-1.5 flex-1 rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground" style={{ width: `${(a.layouts[l] / maxLayout) * 100}%` }} />
              </div>
              <span className="w-4 text-right tabular-nums">{a.layouts[l]}</span>
            </div>
          ))}
        </div>
        <span className="label-xs pt-2 text-muted-foreground">
          {t("analysis.issues")} · {a.issues.filter((i) => i.severity === "warn").length}
        </span>
        <IssueList issues={a.issues.filter((i) => i.severity === "warn")} onGo={onGo} />
      </section>
    </div>
  );
}

/* ───────── JSON ───────── */

export function JsonPanel({ deck, onReplace, onAppend }: { deck: Presentation; onReplace: (s: Slide[]) => void; onAppend: (s: Slide[]) => void }) {
  const { t, locale } = usePrefs();
  const json = JSON.stringify(exportPresentation(deck), null, 2);
  const title = tx(deck.title, deck.defaultLanguage) || "xlide";
  return (
    <div className="flex flex-col gap-6">
      <TemplateJson />
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t("json.import")}</h3>
        <ImportPanel
          actions={[
            { label: t("json.append"), variant: "outline", run: (p) => { onAppend(p.slides); toast.success(t("json.imported", { n: p.slides.length })); } },
            { label: t("json.replace"), run: (p) => { onReplace(p.slides); toast.success(t("json.imported", { n: p.slides.length })); } },
          ]}
        />
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => {
            const copy = savePresentation(presentationFromImport(JSON.parse(JSON.stringify(exportPresentation(deck))), locale));
            toast.success(t("json.imported", { n: copy.slides.length }));
          }}
        >
          {t("json.asNew")}
        </Button>
      </section>
      <Separator />
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t("json.export")}</h3>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(json);
                toast.success(t("json.copied"));
              }}
            >
              <Copy /> {t("json.copy")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
                a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              <Download /> {t("json.download")}
            </Button>
          </div>
        </div>
        <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-card p-3 font-mono text-[0.7rem] leading-relaxed">{json}</pre>
      </section>
    </div>
  );
}

/* ───────── Deck settings ───────── */

export function DeckPanel({ deck, lang, onChange }: { deck: Presentation; lang: Locale; onChange: (p: Partial<Presentation>) => void }) {
  const { t } = usePrefs();
  const common = { lang, languages: deck.languages, fallback: deck.defaultLanguage };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{t("template.label")}</Label>
        <Segmented
          value={deck.template ?? "editorial"}
          options={TEMPLATES.map((v) => ({ value: v, label: t(`template.${v}`) }))}
          onChange={(v) => onChange({ template: v as Template })}
        />
      </div>
      <AccentPicker value={deck.accent ?? DEFAULT_ACCENT} onChange={(accent) => onChange({ accent })} />
      <Separator />
      <LTextField label={t("editor.deckTitle")} value={deck.title} onChange={(v) => onChange({ title: v ?? "" })} {...common} />
      <LTextField label={t("editor.deckDescription")} value={deck.description} multiline onChange={(v) => onChange({ description: v })} {...common} />
      <div className="flex flex-col gap-1.5">
        <Label>{t("editor.deckAuthor")}</Label>
        <Input value={deck.author ?? ""} onChange={(e) => onChange({ author: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("editor.deckTags")}</Label>
        <Input
          defaultValue={(deck.tags ?? []).join(", ")}
          onBlur={(e) => onChange({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      </div>
      <Separator />
      <div className="flex flex-col gap-2">
        <Label>{t("editor.languages")}</Label>
        <div className="flex flex-col gap-2">
          {LOCALES.map((l) => {
            const on = deck.languages.includes(l);
            return (
              <label key={l} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <span className="text-sm">
                  <span className="label-xs mr-2 text-muted-foreground">{LOCALE_SHORT[l]}</span>
                  {t(`lang.${l}`)}
                </span>
                <Switch
                  checked={on}
                  disabled={on && deck.languages.length === 1}
                  onCheckedChange={(v) => {
                    const languages = v ? LOCALES.filter((x) => deck.languages.includes(x) || x === l) : deck.languages.filter((x) => x !== l);
                    onChange({ languages, defaultLanguage: languages.includes(deck.defaultLanguage) ? deck.defaultLanguage : languages[0] });
                  }}
                />
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{t("editor.defaultLanguage")}</Label>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {deck.languages.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onChange({ defaultLanguage: l })}
              className={cn("flex-1 rounded-md py-1.5 text-xs font-semibold", deck.defaultLanguage === l ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              {LOCALE_SHORT[l]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
