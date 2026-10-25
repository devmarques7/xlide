import { ArrowLeft, Download, Languages, Loader2, Music2, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BackgroundPicker, FontPicker } from "@/components/lyrics-controls";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { TKey } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { savePresentation } from "@/lib/store";
import { SHIPPED_AT, type Presentation, type Slide } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { DEFAULT_BG } from "@/slides/lyrics";
import { SlideFrame } from "@/slides/SlideView";

/** Google Translate codes offered for lyrics; names come from Intl in the reader's language. */
const TARGETS = [
  "pt", "en", "nl", "es", "fr", "de", "it", "ro", "pl", "ru", "uk", "el", "tr", "ar", "he", "fa", "hi", "bn", "ur",
  "zh-CN", "zh-TW", "ja", "ko", "id", "tl", "vi", "th", "sw", "am", "yo", "ig", "ha", "af", "sv", "no", "da", "fi",
  "cs", "sk", "hu", "bg", "sr", "hr", "ht", "pap",
];

const FETCH_ERRORS = ["bad_url", "no_captions", "empty_captions", "youtube_failed"];

interface Fetched {
  title?: string;
  author?: string;
  lines?: string[];
  auto?: boolean;
  error?: string;
}

/**
 * Splits lyric rows into slides: an empty row closes a stanza, and each stanza
 * is cut into groups of `per` lines. Translation rows follow the same indexes.
 */
function groupRows(rows: string[], per: number) {
  const groups: number[][] = [];
  let stanza: number[] = [];
  const flush = () => {
    for (let i = 0; i < stanza.length; i += per) groups.push(stanza.slice(i, i + per));
    stanza = [];
  };
  rows.forEach((r, i) => (r.trim() ? stanza.push(i) : flush()));
  flush();
  return groups;
}

export default function Music() {
  const { t, locale } = usePrefs();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"fetch" | "translate" | null>(null);
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [auto, setAuto] = useState(false);
  const [target, setTarget] = useState("");
  const [translation, setTranslation] = useState("");
  const [per, setPer] = useState(2);
  const [bg, setBg] = useState(DEFAULT_BG);
  const [font, setFont] = useState("grotesk");
  const [notice, setNotice] = useState<string | null>(null);

  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      return null;
    }
  }, [locale]);

  const errorText = (code?: string) =>
    t(`music.err.${code && FETCH_ERRORS.includes(code) ? code : "youtube_failed"}` as TKey);

  const fetchLyrics = async () => {
    setBusy("fetch");
    setNotice(null);
    try {
      const res = await fetch(`/api/music/lyrics?url=${encodeURIComponent(url)}`);
      const data: Fetched = await res.json();
      if (data.title) setSong(cleanTitle(data.title));
      if (data.author) setArtist(data.author.replace(/\s*-\s*Topic$/, ""));
      if (data.lines?.length) {
        setLyrics(data.lines.join("\n"));
        setTranslation("");
      }
      setAuto(!!data.auto);
      if (data.error) setNotice(errorText(data.error));
    } catch {
      setNotice(errorText("youtube_failed"));
    } finally {
      setBusy(null);
    }
  };

  const translate = async () => {
    if (!target) return;
    setBusy("translate");
    try {
      const rows = lyrics.split("\n");
      // Empty rows stay empty so both columns keep the same slide breaks.
      const filled = rows.map((r, i) => [r.trim(), i] as const).filter(([r]) => r);
      const res = await fetch("/api/music/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: filled.map(([r]) => r), target }),
      });
      if (!res.ok) throw new Error();
      const { lines } = (await res.json()) as { lines: string[] };
      const out = rows.map(() => "");
      filled.forEach(([, i], k) => (out[i] = lines[k] ?? ""));
      setTranslation(out.join("\n"));
    } catch {
      toast.error(t("music.err.translate_failed"));
    } finally {
      setBusy(null);
    }
  };

  const slides = useMemo<Slide[]>(() => {
    const rows = lyrics.split("\n");
    const trans = translation.split("\n");
    const hasTrans = translation.trim().length > 0;
    const credit = [song, artist].filter(Boolean).join(" · ");
    const body = groupRows(rows, per).map<Slide>((g) => ({
      id: uid("s_"),
      layout: "lyrics",
      tone: "dark",
      title: g.map((i) => rows[i].trim()).join("\n"),
      subtitle: hasTrans ? g.map((i) => (trans[i] ?? "").trim()).join("\n") : undefined,
      bg,
      font,
    }));
    if (!body.length) return [];
    const cover: Slide = { id: uid("s_"), layout: "lyrics", tone: "dark", title: song || "—", eyebrow: artist, bg, font };
    // A last slide with only the background, to rest on between songs.
    const rest: Slide = { id: uid("s_"), layout: "lyrics", tone: "dark", title: "", bg, font, cta: credit };
    return [cover, ...body, rest];
  }, [lyrics, translation, per, bg, font, song, artist]);

  const create = () => {
    const now = Date.now();
    const deck: Presentation = {
      id: uid("p_"),
      title: song || t("music.title"),
      author: artist || undefined,
      description: url || undefined,
      tags: ["música", "worship"],
      languages: [locale],
      defaultLanguage: locale,
      template: "editorial",
      slides,
      createdAt: Math.max(now, SHIPPED_AT),
      updatedAt: now,
    };
    savePresentation(deck);
    navigate(`/p/${deck.id}`);
  };

  const preview = slides[1] ?? slides[0];

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" asChild aria-label={t("nav.back")}>
          <Link to="/">
            <ArrowLeft />
          </Link>
        </Button>
        <Music2 className="size-5" />
        <h1 className="text-lg font-medium">{t("music.title")}</h1>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 p-4 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">{t("music.intro")}</p>

          <form
            className="flex flex-col gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              fetchLyrics();
            }}
          >
            <Label htmlFor="yt">{t("music.youtube")}</Label>
            <div className="flex gap-2">
              <Input id="yt" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
              <Button type="submit" disabled={!url.trim() || busy !== null}>
                {busy === "fetch" ? <Loader2 className="animate-spin" /> : <Download />} {t("music.fetch")}
              </Button>
            </div>
            {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
          </form>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="song">{t("music.song")}</Label>
              <Input id="song" value={song} onChange={(e) => setSong(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="artist">{t("music.artist")}</Label>
              <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lyrics">{t("music.lyrics")}</Label>
              <Textarea id="lyrics" rows={16} value={lyrics} onChange={(e) => setLyrics(e.target.value)} className="text-sm leading-6" />
              <p className="text-xs text-muted-foreground">{auto ? t("music.auto") + " " : ""}{t("music.lyricsHint")}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trans">{t("music.translation")}</Label>
              <Textarea id="trans" rows={16} value={translation} onChange={(e) => setTranslation(e.target.value)} className="text-sm leading-6" />
              <p className="text-xs text-muted-foreground">{t("music.translationHint")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="target">{t("music.translateTo")}</Label>
              <select
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="h-10 border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("music.noTranslation")}</option>
                {TARGETS.map((c) => (
                  <option key={c} value={c}>
                    {names?.of(c) ?? c}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline" onClick={translate} disabled={!target || !lyrics.trim() || busy !== null}>
              {busy === "translate" ? <Loader2 className="animate-spin" /> : <Languages />} {t("music.translate")}
            </Button>
            <div className="ml-auto flex flex-col gap-1.5">
              <Label>{t("music.linesPerSlide")}</Label>
              <div className="flex">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPer(n)}
                    className={cn("h-10 w-10 border border-border text-sm", per === n ? "bg-foreground text-background" : "hover:bg-accent")}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col gap-1.5">
            <Label>{t("music.preview")}</Label>
            {preview ? (
              <SlideFrame slide={preview} lang={locale} animate />
            ) : (
              <SlideFrame slide={{ id: "empty", layout: "lyrics", title: song || "♪", bg, font }} lang={locale} animate />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("editor.fields.font")}</Label>
            <FontPicker value={font} onChange={setFont} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("editor.fields.bg")}</Label>
            <BackgroundPicker value={bg} onChange={setBg} />
          </div>
          <Button size="lg" onClick={create} disabled={slides.length === 0}>
            <Play /> {t("music.create", { n: slides.length })}
          </Button>
        </section>
      </main>
    </div>
  );
}

/** "Song (Official Video) | Live from X" → "Song". */
function cleanTitle(title: string) {
  return title
    .replace(/\s*[([](official|lyric|lyrics|live|audio|video|clipe|ao vivo|letra)[^)\]]*[)\]]/gi, "")
    .split(/\s+[|•]\s+/)[0]
    .trim();
}
