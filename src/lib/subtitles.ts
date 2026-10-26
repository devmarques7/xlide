/*
 * Lyrics with times, as subtitle files: SRT (start --> end) and LRC ([m:ss.xx]).
 * In the Music page each row keeps its start as an LRC tag; these helpers turn
 * that into a timeline of cues and back, and read files people paste or upload.
 */

export interface Cue {
  /** Row index in the lyrics text. */
  row: number;
  start: number;
  end: number;
  text: string;
}

/** "[1:02.50] words" → { text: "words", at: 62.5 }; rows without a time have no `at`. */
export function parseRow(row: string): { text: string; at?: number } {
  const m = row.match(/^\s*\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
  return m ? { text: m[3].trim(), at: Number(m[1]) * 60 + Number(m[2]) } : { text: row.trim() };
}

/** Seconds → "[1:02.50]" (LRC tag). */
export const lrcStamp = (sec: number) => `[${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, "0")}]`;

/** Seconds → "01:02.50" for the timeline. */
export const shortTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${(sec % 60).toFixed(2).padStart(5, "0")}`;

/** "1:02.5", "01:02,50", "62.5" or "00:01:02,500" → seconds; null when unreadable. */
export function readTime(s: string): number | null {
  const parts = s.trim().replace(",", ".").split(":").map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

/** SRT time "00:01:02,500". */
const srtTime = (sec: number) => {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
};

/** A line on screen stays until the next one, at most this long. */
const MAX_HOLD = 8;

/** Timed rows of the lyrics as cues, in time order; each ends when the next starts. */
export function toCues(lyrics: string): Cue[] {
  const cues = lyrics
    .split("\n")
    .map((r, row) => ({ row, ...parseRow(r) }))
    .filter((r): r is { row: number; text: string; at: number } => r.at != null && !!r.text)
    .sort((a, b) => a.at - b.at);
  return cues.map((c, i) => ({ row: c.row, start: c.at, end: Math.min(cues[i + 1]?.at ?? c.at + 4, c.at + MAX_HOLD), text: c.text }));
}

export const isSrt = (text: string) => /\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->/.test(text);
export const isLrc = (text: string) => /^\s*\[\d+:\d{2}(?:[.:]\d+)?\]/m.test(text);

/**
 * SRT or LRC text → lyrics rows with LRC tags, in time order. A pause of 4 s
 * or more between lines becomes an empty row, so it starts a new slide.
 */
export function importTimed(text: string): string {
  const rows: { at: number; text: string }[] = [];
  if (isSrt(text)) {
    for (const block of text.replace(/\r/g, "").split(/\n\s*\n/)) {
      const lines = block.trim().split("\n");
      const i = lines.findIndex((l) => l.includes("-->"));
      if (i < 0) continue;
      const at = readTime(lines[i].split("-->")[0]);
      // Tags like <i> and {\an8} are for players, not for slides.
      const words = lines
        .slice(i + 1)
        .join(" ")
        .replace(/<[^>]+>|\{[^}]+\}/g, "")
        .trim();
      if (at != null && words) rows.push({ at, text: words });
    }
  } else {
    for (const line of text.replace(/\r/g, "").split("\n")) {
      // LRC rows may carry several times when a line repeats: one row each.
      const tags = [...line.matchAll(/\[(\d+):(\d{2}(?:[.:]\d+)?)\]/g)];
      const words = line.replace(/\[[^\]]*\]/g, "").trim();
      for (const m of tags) rows.push({ at: Number(m[1]) * 60 + Number(m[2].replace(":", ".")), text: words });
    }
  }
  rows.sort((a, b) => a.at - b.at);
  const out: string[] = [];
  rows.forEach((r, i) => {
    if (!r.text) return;
    const prev = rows[i - 1];
    if (prev && r.at - prev.at >= 4 + Math.max(0, prev.text.split(" ").length * 0.5) && out.length && out[out.length - 1] !== "") out.push("");
    out.push(`${lrcStamp(r.at)} ${r.text}`);
  });
  return out.join("\n");
}

/** Cues as an SRT file (text may span lines). */
export function cuesToSrt(cues: { start: number; end: number; text: string }[]): string {
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join("\n");
}

/** The timed rows as an SRT file. */
export const toSrt = (lyrics: string) => cuesToSrt(toCues(lyrics));

/** Cues as an LRC file: one row per line, each line of a cue at the cue's time. */
export function cuesToLrc(cues: { start: number; text: string }[], title?: string, artist?: string): string {
  const head = [title && `[ti:${title}]`, artist && `[ar:${artist}]`].filter(Boolean);
  const rows = cues.flatMap((c) => c.text.split("\n").map((l) => `${lrcStamp(c.start)}${l}`));
  return [...head, ...rows].join("\n") + "\n";
}

/** The lyrics as an LRC file (timed rows only). */
export function toLrc(lyrics: string, title?: string, artist?: string): string {
  const head = [title && `[ti:${title}]`, artist && `[ar:${artist}]`].filter(Boolean);
  return [...head, ...toCues(lyrics).map((c) => `${lrcStamp(c.start)}${c.text}`)].join("\n") + "\n";
}

/**
 * Rows reordered by time, keeping stanza breaks where the pauses are; untimed
 * rows stay right after the timed row they followed.
 */
export function sortByTime(lyrics: string): string {
  const rows = lyrics.split("\n");
  if (!rows.some((r) => parseRow(r).at != null)) return lyrics;
  // Each untimed row borrows the time of the timed row above it (plus a hair, to keep order).
  let last = 0;
  const keyed = rows.map((r, i) => {
    const { at } = parseRow(r);
    if (at != null) last = at;
    return { r, key: at ?? last + 0.0001 * (i + 1), blank: !parseRow(r).text };
  });
  return keyed
    .filter((k) => !k.blank)
    .sort((a, b) => a.key - b.key)
    .reduce<string[]>((out, k, i, all) => {
      const prevAt = i ? parseRow(all[i - 1].r).at : undefined;
      const at = parseRow(k.r).at;
      if (i && prevAt != null && at != null && at - prevAt >= 6 && out[out.length - 1] !== "") out.push("");
      out.push(k.r);
      return out;
    }, [])
    .join("\n");
}

/** Saves text as a file. */
export function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
