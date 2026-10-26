import { Download, FileUp, Languages, Loader2, Minus, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BackgroundPicker, FontPicker } from "@/components/lyrics-controls";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { TKey } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { alignToFile, cuesToLrc, cuesToSrt, download, importTimed, parseRow, readTime, shortTime } from "@/lib/subtitles";
import { SONG_SECTIONS, tx, type Locale, type MusicTrack, type Presentation, type Slide } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { clock, youtubeId } from "@/lib/youtube";

/** A deck made of lyrics slides gets the music editor (timing, sections, colours). */
export const isMusicDeck = (deck: Presentation) => {
  const lyrics = deck.slides.filter((s) => s.layout === "lyrics").length;
  return lyrics > 0 && lyrics >= deck.slides.length / 2;
};

/** Google Translate codes offered for lyrics (same list as the Music page). */
const TARGETS = ["pt", "en", "nl", "es", "fr", "de", "it", "ro", "pl", "ru", "uk", "el", "tr", "ar", "he", "fa", "hi", "zh-CN", "ja", "ko", "id", "tl", "vi", "sw", "af", "sv", "no", "da", "fi", "ht", "pap"];

const SPEEDS = [0.75, 0.9, 1, 1.1, 1.25];

/** Lyric colour choices: warm white, pure white, soft gold, sky, rose, black ink (for light backgrounds). */
const INKS = ["#f7f5f0", "#ffffff", "#f5c26b", "#9fd8ff", "#ff9fb2", "#0f1f1c"];

const lines = (s: Slide, lang: Locale, fb: Locale) => tx(s.title, lang, fb);

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Seconds input as "m:ss.xx"; empty clears the time. */
function TimeInput({ value, onChange, className }: { value?: number; onChange: (sec: number | undefined) => void; className?: string }) {
  return (
    <input
      key={value ?? "none"}
      defaultValue={value != null ? shortTime(value) : ""}
      placeholder="--:--.--"
      className={cn("w-full bg-transparent px-1 py-0.5 font-mono tabular-nums outline-none focus:bg-muted", className)}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (!v) return value != null && onChange(undefined);
        const sec = readTime(v);
        if (sec == null) e.target.value = value != null ? shortTime(value) : "";
        else if (sec !== value) onChange(Math.round(sec * 100) / 100);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

/* ───────── Letra tab: the slide's place in the song ───────── */

export function MusicSlideFields({ slide, onChange }: { slide: Slide; onChange: (patch: Partial<Slide>) => void }) {
  const { t } = usePrefs();
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <Field label={t("music.section")}>
        <div className="grid grid-cols-4 gap-1">
          {SONG_SECTIONS.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => onChange({ section: slide.section === sec ? undefined : sec })}
              className={cn(
                "border border-border px-1 py-1.5 text-[0.7rem]",
                slide.section === sec ? "bg-foreground text-background" : "hover:bg-accent",
              )}
            >
              {t(`section.${sec}` as TKey)}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("music.repeat")}>
          <div className="flex items-center border border-border">
            <Button variant="ghost" size="icon-sm" onClick={() => onChange({ repeat: (slide.repeat ?? 1) > 2 ? (slide.repeat ?? 1) - 1 : undefined })} aria-label="−">
              <Minus />
            </Button>
            <span className="flex-1 text-center text-sm tabular-nums">×{slide.repeat ?? 1}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => onChange({ repeat: Math.min(9, (slide.repeat ?? 1) + 1) })} aria-label="+">
              <Plus />
            </Button>
          </div>
        </Field>
        <Field label={t("timeline.start")}>
          <div className="flex h-8 items-center border border-border px-1 text-sm">
            <TimeInput value={slide.at} onChange={(at) => onChange({ at })} />
          </div>
        </Field>
      </div>
    </div>
  );
}

/* ───────── Estilo tab: how the words look on the big screen ───────── */

function InkPicker({ value, onChange, allowNone }: { value?: string; onChange: (v: string | undefined) => void; allowNone?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cn("h-8 border border-border px-2 text-[0.7rem]", !value && "bg-foreground text-background")}
        >
          {allowNone}
        </button>
      )}
      {INKS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          title={c}
          onClick={() => onChange(c)}
          className={cn("size-8 border border-border", value === c && "ring-2 ring-foreground ring-offset-1 ring-offset-background")}
          style={{ background: c }}
        />
      ))}
      <input type="color" value={value ?? "#f7f5f0"} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer border border-border bg-transparent" aria-label="#" />
    </div>
  );
}

export function MusicStylePanel({
  deck,
  slide,
  onMusic,
  onAllLyrics,
}: {
  deck: Presentation;
  slide?: Slide;
  onMusic: (patch: Partial<MusicTrack>) => void;
  onAllLyrics: (patch: Partial<Slide>) => void;
}) {
  const { t } = usePrefs();
  const m = deck.music ?? {};
  const ref = slide?.layout === "lyrics" ? slide : deck.slides.find((s) => s.layout === "lyrics");
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">{t("music.styleHint")}</p>
      <Field label={t("music.ink")}>
        <InkPicker value={m.ink} onChange={(ink) => onMusic({ ink })} allowNone={t("music.auto.ink")} />
      </Field>
      <Field label={t("music.chorusInk")} hint={t("music.chorusHint")}>
        <InkPicker value={m.chorusInk} onChange={(chorusInk) => onMusic({ chorusInk })} allowNone={t("music.same")} />
      </Field>
      <Field label={t("music.transInk")}>
        <InkPicker value={m.transInk} onChange={(transInk) => onMusic({ transInk })} allowNone={t("music.auto.ink")} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!m.sections} onChange={(e) => onMusic({ sections: e.target.checked || undefined })} className="accent-foreground" />
        {t("music.showSections")}
      </label>
      <Field label={t("editor.fields.font")}>
        <FontPicker value={ref?.font} onChange={(font) => onAllLyrics({ font })} />
      </Field>
      <Field label={t("editor.fields.bg")}>
        <BackgroundPicker value={ref?.bg} onChange={(bg) => onAllLyrics({ bg })} />
      </Field>
    </div>
  );
}

/* ───────── Tempo tab: the deck as a timeline ───────── */

export function MusicTimePanel({
  deck,
  index,
  lang,
  onGo,
  setSlides,
  onMusic,
}: {
  deck: Presentation;
  index: number;
  lang: Locale;
  onGo: (i: number) => void;
  setSlides: (slides: Slide[]) => void;
  onMusic: (patch: Partial<MusicTrack>) => void;
}) {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const file = useRef<HTMLInputElement>(null);
  const fb = deck.defaultLanguage;
  const m = deck.music ?? {};
  const name = (tx(deck.title, lang, fb) || "lyrics").replace(/[\\/:*?"<>|]+/g, "").trim() || "lyrics";

  /** Each timed slide as a cue: until the next timed slide, 8 s at most. */
  const cues = useMemo(() => {
    const timed = deck.slides.map((s, i) => ({ s, i })).filter(({ s }) => s.at != null);
    return timed.map(({ s, i }, k) => {
      const next = timed[k + 1]?.s.at;
      const text = [lines(s, lang, fb), tx(s.subtitle, lang, fb)].filter(Boolean).join("\n");
      return { i, start: s.at!, end: Math.min(next ?? s.at! + 4, s.at! + 8), text: lines(s, lang, fb), both: text };
    });
  }, [deck.slides, lang, fb]);
  const total = Math.max(1, cues.at(-1)?.end ?? 1);

  const setAt = (i: number, at: number | undefined) => setSlides(deck.slides.map((s, k) => (k === i ? { ...s, at } : s)));
  const shift = (d: number) =>
    setSlides(deck.slides.map((s) => (s.at == null ? s : { ...s, at: Math.max(0, Math.round((s.at + d) * 100) / 100) })));

  /**
   * SRT/LRC in: the slides' words are found in the file and each slide takes the
   * time its words are sung; failing that, lines are matched by their start; if
   * most lines are not in the slides, the slides are rebuilt from the file
   * (keeping the cover and the look).
   */
  const importFile = async (f: File) => {
    const text = await f.text();
    // First: find each slide's words in the file (works with rough AI transcriptions too).
    const aligned = alignToFile(
      deck.slides.map((s, i) => (i === 0 || s.layout !== "lyrics" ? "" : lines(s, lang, fb).replace(/\n/g, " "))),
      text,
    );
    if (aligned && aligned.matched >= 0.4) {
      const times = aligned.lyrics.split("\n").map((r) => parseRow(r).at);
      setSlides(deck.slides.map((s, i) => (i === 0 ? { ...s, at: 0 } : times[i] != null ? { ...s, at: times[i] } : s)));
      toast.success(t("timeline.aligned", { n: Math.round(aligned.matched * 100) }));
      return;
    }
    const rows = importTimed(text)
      .split("\n")
      .map(parseRow)
      .filter((r) => r.text && r.at != null) as { text: string; at: number }[];
    if (!rows.length) return toast.error(t("music.importEmpty"));
    const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, " ").trim();
    const slideText = deck.slides.map((s) => norm(lines(s, lang, fb)));
    const next = deck.slides.map((s) => ({ ...s }));
    let from = 1;
    let hits = 0;
    for (const r of rows) {
      const want = norm(r.text);
      const k = slideText.findIndex((txt, i) => i >= from && !!want && txt.startsWith(want.slice(0, 24)));
      if (k > 0) {
        next[k].at = r.at;
        from = k + 1;
        hits++;
      }
    }
    if (hits >= rows.length * 0.5) {
      setSlides(next);
      toast.success(t("music.importMatched", { n: hits }));
      return;
    }
    const look = deck.slides.find((s) => s.layout === "lyrics") ?? deck.slides[0];
    const cover = deck.slides[0];
    const built: Slide[] = rows.map((r) => ({ id: uid("s_"), layout: "lyrics", tone: "dark", title: r.text, bg: look?.bg, font: look?.font, at: r.at }));
    setSlides(cover?.layout === "lyrics" ? [{ ...cover, at: 0 }, ...built] : built);
    toast.success(t("music.importBuilt", { n: built.length }));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("music.speed")}>
          <div className="flex">
            {SPEEDS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onMusic({ speed: v === 1 ? undefined : v })}
                className={cn("h-8 flex-1 border border-border text-[0.7rem] tabular-nums", (m.speed ?? 1) === v ? "bg-foreground text-background" : "hover:bg-accent")}
              >
                {v}×
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("play.offset")}>
          <div className="flex h-8 items-center border border-border">
            <Button variant="ghost" size="icon-sm" onClick={() => onMusic({ offset: Math.round(((m.offset ?? 0) - 0.25) * 100) / 100 })} aria-label={t("play.later")}>
              <Minus />
            </Button>
            <span className="flex-1 text-center text-xs tabular-nums">
              {(m.offset ?? 0) > 0 ? "+" : ""}
              {(m.offset ?? 0).toFixed(2)}s
            </span>
            <Button variant="ghost" size="icon-sm" onClick={() => onMusic({ offset: Math.round(((m.offset ?? 0) + 0.25) * 100) / 100 })} aria-label={t("play.earlier")}>
              <Plus />
            </Button>
          </div>
        </Field>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <input
          ref={file}
          type="file"
          accept=".srt,.lrc,.txt,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importFile(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" onClick={() => file.current?.click()}>
          <FileUp /> {t("timeline.import")}
        </Button>
        <Button variant="outline" size="sm" disabled={!cues.length} onClick={() => download(`${name}.srt`, cuesToSrt(cues.map((c) => ({ ...c, text: c.both }))), "application/x-subrip")}>
          <Download /> SRT
        </Button>
        <Button variant="outline" size="sm" disabled={!cues.length} onClick={() => download(`${name}.lrc`, cuesToLrc(cues, tx(deck.title, lang, fb), deck.author))}>
          <Download /> LRC
        </Button>
        <Button size="sm" className="ml-auto" onClick={() => navigate(`/play/${deck.id}`)}>
          <Play /> {t("play.start")}
        </Button>
      </div>

      {cues.length > 0 && (
        <>
          <div className="relative h-6 border border-border bg-muted/40">
            {cues.map((c) => {
              const s = deck.slides[c.i];
              return (
                <button
                  key={c.i}
                  type="button"
                  title={`${shortTime(c.start)} · ${c.text}`}
                  onClick={() => onGo(c.i)}
                  className={cn(
                    "absolute inset-y-0 border-r border-background",
                    c.i === index ? "bg-foreground" : s.section === "chorus" ? "bg-foreground/60" : "bg-foreground/30",
                  )}
                  style={{ left: `${(c.start / total) * 100}%`, width: `max(3px, ${((c.end - c.start) / total) * 100}%)` }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground tabular-nums">
            <span>0:00</span>
            <span className="flex items-center gap-1">
              {t("timeline.shift")}
              <Button variant="ghost" size="icon-sm" onClick={() => shift(-0.5)} aria-label="−0.5s" title="−0.5s">
                <Minus />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => shift(0.5)} aria-label="+0.5s" title="+0.5s">
                <Plus />
              </Button>
            </span>
            <span>{clock(total)}</span>
          </div>
        </>
      )}

      <div className="max-h-[28rem] overflow-y-auto border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="w-8 px-2 py-1.5 font-normal">#</th>
              <th className="w-24 px-2 py-1.5 font-normal">{t("timeline.start")}</th>
              <th className="px-2 py-1.5 font-normal">{t("timeline.text")}</th>
            </tr>
          </thead>
          <tbody>
            {deck.slides.map((s, i) => (
              <tr key={s.id} className={cn("border-b border-border/60 last:border-0", i === index && "bg-muted")}>
                <td className="px-2 py-1 text-muted-foreground tabular-nums">
                  <button type="button" onClick={() => onGo(i)} className="hover:text-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </button>
                </td>
                <td className="px-1 py-0.5">
                  <TimeInput value={s.at} onChange={(at) => setAt(i, at)} />
                </td>
                <td className="px-2 py-1">
                  <button type="button" onClick={() => onGo(i)} className="block w-full truncate text-left">
                    {s.section && <span className="label-xs mr-1.5 text-[0.6rem] text-muted-foreground">{t(`section.${s.section}` as TKey)}</span>}
                    {lines(s, lang, fb).split("\n")[0] || "—"}
                    {s.repeat && s.repeat > 1 && <span className="ml-1.5 text-muted-foreground">×{s.repeat}</span>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── Música tab: the song, its languages and translation ───────── */

export function MusicDeckPanel({
  deck,
  lang,
  setSlides,
  onMusic,
}: {
  deck: Presentation;
  lang: Locale;
  setSlides: (slides: Slide[]) => void;
  onMusic: (patch: Partial<MusicTrack>) => void;
}) {
  const { t, locale } = usePrefs();
  const fb = deck.defaultLanguage;
  const [link, setLink] = useState(deck.music?.video ? `https://www.youtube.com/watch?v=${deck.music.video}` : "");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      return null;
    }
  }, [locale]);

  /** Translates every lyrics slide into `subtitle`, keeping one translated line per sung line. */
  const translateAll = async () => {
    setBusy(true);
    try {
      const rows = deck.slides.map((s) => (s.layout === "lyrics" ? lines(s, lang, fb).split("\n") : []));
      const flat = rows.flat().map((l) => l.trim());
      const ask = flat.filter(Boolean);
      const res = await fetch("/api/music/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: ask, target }),
      });
      if (!res.ok) throw new Error();
      const { lines: out } = (await res.json()) as { lines: string[] };
      let k = 0;
      // The cover (first slide) keeps its artist line instead of a translated title.
      setSlides(
        deck.slides.map((s, i) => {
          if (!rows[i].length) return s;
          const tr = rows[i].map((l) => (l.trim() ? (out[k++] ?? "") : ""));
          return i === 0 ? s : { ...s, subtitle: tr.join("\n") };
        }),
      );
      toast.success(t("music.translated"));
    } catch {
      toast.error(t("music.err.translate_failed"));
    } finally {
      setBusy(false);
    }
  };

  const clearTranslation = () => setSlides(deck.slides.map((s, i) => (s.layout === "lyrics" && i > 0 ? { ...s, subtitle: undefined } : s)));
  const hasTranslation = deck.slides.some((s, i) => i > 0 && s.layout === "lyrics" && tx(s.subtitle, lang, fb));

  return (
    <div className="flex flex-col gap-5 border-b border-border pb-5">
      <Field label={t("music.youtube")} hint={t("music.linkHint")}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = youtubeId(link);
            if (link.trim() && !v) return toast.error(t("music.err.bad_url"));
            onMusic({ video: v ?? undefined });
            toast.success(t("music.linkSaved"));
          }}
        >
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
          <Button type="submit" variant="outline">
            {t("common.save")}
          </Button>
        </form>
      </Field>
      <Field label={t("music.translateAll")} hint={t("music.translateAllHint")}>
        <div className="flex gap-2">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-9 min-w-0 flex-1 border border-input bg-background px-2 text-sm">
            <option value="">{t("music.translateTo")}…</option>
            {TARGETS.map((c) => (
              <option key={c} value={c}>
                {names?.of(c) ?? c}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={translateAll} disabled={!target || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Languages />} {t("music.translate")}
          </Button>
        </div>
        {hasTranslation && (
          <Button variant="ghost" size="sm" className="self-start" onClick={clearTranslation}>
            <Trash2 /> {t("music.clearTranslation")}
          </Button>
        )}
      </Field>
    </div>
  );
}
