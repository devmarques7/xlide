import { useEffect, useMemo, useState } from "react";
import type { Board } from "./boards";

/** Languages a board can be read in. Content is machine-translated on demand. */
export const CONTENT_LANGS = [
  { code: "original", name: "Original" },
  { code: "pt", name: "Português" },
  { code: "en", name: "English" },
  { code: "nl", name: "Nederlands" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number]["code"];
export const isContentLang = (v: unknown): v is ContentLang => CONTENT_LANGS.some((l) => l.code === v);

/* line → translation, per language; kept in memory and in localStorage. */
const inflight = new Set<string>();
const caches = new Map<string, Map<string, string>>();
function cacheFor(lang: string) {
  let c = caches.get(lang);
  if (!c) {
    c = new Map();
    try {
      const raw = localStorage.getItem(`xlide.btr.${lang}`);
      if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, string>)) c.set(k, v);
    } catch {
      /* ignore */
    }
    caches.set(lang, c);
  }
  return c;
}
function persist(lang: string) {
  const c = caches.get(lang);
  if (!c) return;
  try {
    // Keep the newest 3000 lines.
    localStorage.setItem(`xlide.btr.${lang}`, JSON.stringify(Object.fromEntries([...c].slice(-3000))));
  } catch {
    /* quota */
  }
}

/**
 * Translates in the reader's own browser (Google's endpoint allows it), so each
 * person uses their own quota; the XLIDE server is the fallback. Same approach
 * as translateLines in api/_music.js: newline-joined batches, line by line if
 * the count drifts.
 */
async function translateInBrowser(lines: string[], target: string): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 40) {
    const chunk = lines.slice(i, i + 40);
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ q: chunk.join("\n") }),
    });
    if (!res.ok) throw new Error(`translate_${res.status}`);
    const data = (await res.json()) as [[string, ...unknown[]][]];
    const parts = (data[0] ?? []).map((p) => p[0]).join("").split("\n").map((x) => x.trim());
    if (parts.length === chunk.length) out.push(...parts);
    else for (const l of chunk) out.push((await translateInBrowser([l], target))[0] ?? l);
  }
  return out;
}

async function translateViaServer(lines: string[], target: string): Promise<string[]> {
  const res = await fetch("/api/music/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines, target }),
  });
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) throw new Error(String(res.status));
  return ((await res.json()) as { lines: string[] }).lines;
}

const skip = (l: string) => !l.trim() || /^https?:\/\//i.test(l.trim()) || /^[\d\s.,%:+\-/#·→]+$/.test(l);

function texts(b: Board) {
  const out: (string | undefined)[] = [b.title, b.idea, b.summary];
  for (const n of b.nodes) {
    out.push(n.title, n.text, n.subtitle, n.value, n.tag, ...(n.tags ?? []), ...(n.items ?? []).map((i) => i.text));
  }
  for (const e of b.edges) out.push(e.label);
  for (const m of b.mood?.items ?? []) out.push(m.text, m.caption, m.title, m.name, ...(m.items ?? []).map((i) => i.text));
  return out.filter((s): s is string => !!s);
}

function apply(b: Board, tr: (s: string) => string): Board {
  const t = <T extends string | undefined>(s: T) => (s ? tr(s) : s) as T;
  return {
    ...b,
    title: t(b.title),
    idea: t(b.idea),
    summary: t(b.summary),
    nodes: b.nodes.map((n) => ({
      ...n,
      title: t(n.title),
      text: t(n.text),
      subtitle: t(n.subtitle),
      value: t(n.value),
      tag: t(n.tag),
      tags: n.tags?.map((x) => tr(x)),
      items: n.items?.map((i) => ({ ...i, text: tr(i.text) })),
    })),
    edges: b.edges.map((e) => ({ ...e, label: t(e.label) })),
    mood: b.mood && {
      items: b.mood.items.map((m) => ({
        ...m,
        text: t(m.text),
        caption: t(m.caption),
        title: t(m.title),
        name: t(m.name),
        items: m.items?.map((i) => ({ ...i, text: tr(i.text) })),
      })),
    },
  };
}

/**
 * The board as this reader sees it: the original, or translated line by line
 * into `lang`. Edits always go to the original; only the view changes.
 */
export function useTranslatedBoard(board: Board, lang: ContentLang) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const missing = useMemo(() => {
    if (lang === "original") return [];
    const c = cacheFor(lang);
    const lines = new Set<string>();
    for (const s of texts(board)) for (const l of s.split("\n")) if (!skip(l) && !c.has(l)) lines.add(l);
    return [...lines];
    // version: re-check after a batch lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, lang, version]);

  // Keyed by content, not by object identity: the board object changes on every sync.
  const missingKey = missing.join("\u0001");
  useEffect(() => {
    const todo = missingKey ? missingKey.split("\u0001").filter((l) => !inflight.has(`${lang}|${l}`)) : [];
    if (!missingKey || lang === "original") {
      setState("idle");
      return;
    }
    if (!todo.length) return;
    setState("loading");
    todo.forEach((l) => inflight.add(`${lang}|${l}`));
    const c = cacheFor(lang);
    const chunks: string[][] = [];
    for (let i = 0; i < todo.length; i += 60) chunks.push(todo.slice(i, i + 60));
    // A few batches at a time; each one shows up as soon as it lands.
    let failedAny = false;
    const run = async (chunk: string[]) => {
      try {
        const lines = await translateInBrowser(chunk, lang).catch(() => translateViaServer(chunk, lang));
        chunk.forEach((l, j) => c.set(l, lines[j] || l));
        persist(lang);
        setVersion((v) => v + 1);
      } catch {
        failedAny = true;
      } finally {
        chunk.forEach((l) => inflight.delete(`${lang}|${l}`));
      }
    };
    (async () => {
      for (let i = 0; i < chunks.length; i += 3) await Promise.all(chunks.slice(i, i + 3).map(run));
      setState(failedAny ? "error" : "idle");
    })();
  }, [missingKey, lang]);

  const shown = useMemo(() => {
    if (lang === "original") return board;
    const c = cacheFor(lang);
    return apply(board, (s) => s.split("\n").map((l) => c.get(l) ?? l).join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, lang, version]);

  return { board: shown, translating: state === "loading", failed: state === "error" };
}

/** Remembers each reader's language per board. */
export function storedLang(boardId: string): ContentLang | null {
  try {
    const v = localStorage.getItem(`xlide.blang.${boardId}`);
    return isContentLang(v) ? v : null;
  } catch {
    return null;
  }
}
export function storeLang(boardId: string, lang: ContentLang) {
  try {
    localStorage.setItem(`xlide.blang.${boardId}`, lang);
  } catch {
    /* ignore */
  }
}
