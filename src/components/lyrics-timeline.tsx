import { ArrowDownUp, Download, ExternalLink, FileUp, Minus, Plus } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { usePrefs } from "@/lib/prefs";
import { alignToFile, download, importTimed, lrcStamp, needsTimes, parseRow, readTime, shortTime, sortByTime, toCues, toLrc, toSrt } from "@/lib/subtitles";
import { youtubeId } from "@/lib/youtube";

/**
 * Free places that turn a song link into an .srt: DownSub and SaveSubs save the
 * video's YouTube captions; TurboScribe transcribes the audio with AI (free
 * plan: a few files a day). The file comes back here to time the lyrics.
 */
const SRT_SOURCES = [
  { id: "downsub", name: "DownSub", url: (link: string) => `https://downsub.com/?url=${encodeURIComponent(link)}` },
  { id: "savesubs", name: "SaveSubs", url: () => "https://savesubs.com/" },
  { id: "turboscribe", name: "TurboScribe", url: () => "https://turboscribe.ai/pt/dashboard" },
] as const;

/**
 * A subtitle file in: lyrics still without times are timed by it (their words
 * found in the file); otherwise, or when they don't match, the file becomes the lyrics.
 */
export function useSubtitleImport(lyrics: string, onChange: (lyrics: string) => void) {
  const { t } = usePrefs();
  return (text: string) => {
    if (needsTimes(lyrics)) {
      const aligned = alignToFile(lyrics.split("\n"), text);
      if (aligned && aligned.matched >= 0.4) {
        onChange(aligned.lyrics);
        toast.success(t("timeline.aligned", { n: Math.round(aligned.matched * 100) }));
        return;
      }
    }
    const rows = importTimed(text);
    if (!rows) return toast.error(t("music.importEmpty"));
    onChange(rows);
    if (lyrics.trim()) toast.message(t("timeline.replaced"));
  };
}

/** Lyrics with one row retimed (or untimed when `sec` is null). */
function retime(lyrics: string, row: number, sec: number | null) {
  return lyrics
    .split("\n")
    .map((r, i) => {
      if (i !== row) return r;
      const { text } = parseRow(r);
      return sec == null ? text : `${lrcStamp(sec)} ${text}`;
    })
    .join("\n");
}

/** Every timed row moved by `d` seconds (never before 0). */
function shiftAll(lyrics: string, d: number) {
  return lyrics
    .split("\n")
    .map((r) => {
      const { text, at } = parseRow(r);
      return at == null ? r : `${lrcStamp(Math.max(0, Math.round((at + d) * 100) / 100))} ${text}`;
    })
    .join("\n");
}

/**
 * The lyrics as a subtitle timeline: each timed row with its start and end,
 * a strip showing where the lines fall in the song, SRT/LRC import and export.
 */
export function LyricsTimeline({
  lyrics,
  onChange,
  song,
  artist,
  link,
}: {
  lyrics: string;
  onChange: (lyrics: string) => void;
  song: string;
  artist: string;
  /** The song's YouTube link, for the SRT services. */
  link?: string;
}) {
  const { t } = usePrefs();
  const importText = useSubtitleImport(lyrics, onChange);
  const video = youtubeId(link);
  const file = useRef<HTMLInputElement>(null);
  const cues = toCues(lyrics);
  const total = Math.max(1, cues.at(-1)?.end ?? 1);
  const name = (song || "lyrics").replace(/[\\/:*?"<>|]+/g, "").trim() || "lyrics";
  const untimed = lyrics.split("\n").filter((r) => parseRow(r).text && parseRow(r).at == null).length;

  const load = async (f: File) => importText(await f.text());

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Label className="mr-auto">{t("timeline.title")}</Label>
        <input
          ref={file}
          type="file"
          accept=".srt,.lrc,.txt,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) load(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" onClick={() => file.current?.click()}>
          <FileUp /> {t("timeline.import")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChange(sortByTime(lyrics))} disabled={!cues.length}>
          <ArrowDownUp /> {t("timeline.sort")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => download(`${name}.srt`, toSrt(lyrics), "application/x-subrip")} disabled={!cues.length}>
          <Download /> SRT
        </Button>
        <Button variant="outline" size="sm" onClick={() => download(`${name}.lrc`, toLrc(lyrics, song, artist))} disabled={!cues.length}>
          <Download /> LRC
        </Button>
      </div>

      {/* Get an .srt for this song elsewhere, then import it. */}
      <div className="flex flex-col gap-1.5 border border-border p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs">{t("timeline.getSrt")}</span>
          {SRT_SOURCES.map((s) => (
            <Button key={s.id} asChild variant="outline" size="sm">
              <a href={s.url(video ? `https://www.youtube.com/watch?v=${video}` : "")} target="_blank" rel="noreferrer">
                {s.name} <ExternalLink />
              </a>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("timeline.getSrtHint")}</p>
      </div>

      {!cues.length ? (
        <p className="border border-dashed border-border p-3 text-xs text-muted-foreground">{t("timeline.empty")}</p>
      ) : (
        <>
          {/* Where each line falls in the song. */}
          <div className="relative h-6 border border-border bg-muted/40" aria-hidden>
            {cues.map((c, i) => (
              <span
                key={c.row}
                title={`${shortTime(c.start)} ${c.text}`}
                className={i % 2 ? "absolute inset-y-0 bg-foreground/45" : "absolute inset-y-0 bg-foreground/70"}
                style={{ left: `${(c.start / total) * 100}%`, width: `max(2px, ${((c.end - c.start) / total) * 100}%)` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground tabular-nums">
            <span>00:00.00</span>
            <span className="flex items-center gap-1">
              {t("timeline.shift")}
              <Button variant="ghost" size="icon-sm" onClick={() => onChange(shiftAll(lyrics, -0.5))} aria-label="−0.5s" title="−0.5s">
                <Minus />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onChange(shiftAll(lyrics, 0.5))} aria-label="+0.5s" title="+0.5s">
                <Plus />
              </Button>
            </span>
            <span>{shortTime(total)}</span>
          </div>

          <div className="max-h-80 overflow-y-auto border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="w-8 px-2 py-1.5 font-normal">#</th>
                  <th className="w-24 px-2 py-1.5 font-normal">{t("timeline.start")}</th>
                  <th className="w-20 px-2 py-1.5 font-normal">{t("timeline.end")}</th>
                  <th className="px-2 py-1.5 font-normal">{t("timeline.text")}</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {cues.map((c, i) => (
                  <tr key={`${c.row}-${c.start}`} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                    <td className="px-1 py-0.5">
                      <input
                        defaultValue={shortTime(c.start)}
                        aria-label={t("timeline.start")}
                        className="w-full bg-transparent px-1 py-0.5 outline-none focus:bg-muted"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          const sec = v ? readTime(v) : null;
                          if (v && sec == null) e.target.value = shortTime(c.start);
                          else if (sec !== c.start) onChange(retime(lyrics, c.row, sec));
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      />
                    </td>
                    <td className="px-2 py-1 text-muted-foreground">{shortTime(c.end)}</td>
                    <td className="px-2 py-1 font-sans">{c.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {untimed > 0 && <p className="text-xs text-muted-foreground">{t("timeline.untimed", { n: untimed })}</p>}
        </>
      )}
    </div>
  );
}
