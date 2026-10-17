import { useSyncExternalStore } from "react";
import { samplePresentations } from "./samples";
import { pitchDeck } from "./templates";
import type { Presentation } from "./types";
import { uid } from "./utils";

const KEY = "xlide.presentations";
type Listener = () => void;

let cache: Presentation[] = read();
const listeners = new Set<Listener>();

const SEED_KEY = "xlide.seeded";
const SEEDS = ["p_pitch"];

function read(): Presentation[] {
  let list: Presentation[] | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) list = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  if (!list) return [pitchDeck(), ...samplePresentations()];
  // Add example decks shipped after this browser first ran XLIDE (once each).
  try {
    const seeded: string[] = JSON.parse(localStorage.getItem(SEED_KEY) || "[]");
    const missing = SEEDS.filter((id) => !seeded.includes(id));
    if (missing.length) {
      if (missing.includes("p_pitch") && !list.some((p) => p.id === "p_pitch")) list = [pitchDeck(), ...list];
      localStorage.setItem(SEED_KEY, JSON.stringify([...seeded, ...missing]));
      localStorage.setItem(KEY, JSON.stringify(list));
    }
  } catch {
    /* ignore */
  }
  return list;
}

function write(next: Presentation[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota or disabled storage — keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Keep tabs in sync.
window.addEventListener("storage", (e) => {
  if (e.key === KEY) {
    cache = read();
    listeners.forEach((l) => l());
  }
});

export function usePresentations() {
  return useSyncExternalStore(subscribe, () => cache);
}

export function usePresentation(id: string | undefined) {
  const all = usePresentations();
  return all.find((p) => p.id === id);
}

export function getPresentation(id: string) {
  return cache.find((p) => p.id === id);
}

/* ───── server mirror (best effort, so phones can load shared decks) ───── */

const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
function pushToServer(p: Presentation) {
  clearTimeout(pushTimers.get(p.id));
  pushTimers.set(
    p.id,
    setTimeout(() => {
      fetch(`/api/presentations/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      }).catch(() => {});
    }, 500),
  );
}

export async function syncFromServer() {
  try {
    const res = await fetch("/api/presentations");
    if (!res.ok) return;
    const remote: Presentation[] = await res.json();
    const byId = new Map(cache.map((p) => [p.id, p]));
    let changed = false;
    for (const r of remote) {
      const local = byId.get(r.id);
      if (!local || r.updatedAt > local.updatedAt) {
        byId.set(r.id, r);
        changed = true;
      }
    }
    if (changed) write([...byId.values()]);
    for (const p of cache) {
      const r = remote.find((x) => x.id === p.id);
      if (!r || p.updatedAt > r.updatedAt) pushToServer(p);
    }
  } catch {
    /* offline / static hosting */
  }
}

export async function fetchPresentation(id: string): Promise<Presentation | undefined> {
  try {
    const res = await fetch(`/api/presentations/${id}`);
    if (res.ok) return await res.json();
  } catch {
    /* fall through */
  }
  return getPresentation(id);
}

/* ───── mutations ───── */

export function savePresentation(p: Presentation) {
  const next = { ...p, updatedAt: Date.now() };
  const exists = cache.some((x) => x.id === p.id);
  write(exists ? cache.map((x) => (x.id === p.id ? next : x)) : [next, ...cache]);
  pushToServer(next);
  return next;
}

export function updatePresentation(id: string, fn: (p: Presentation) => Presentation) {
  const p = getPresentation(id);
  if (p) savePresentation(fn(p));
}

export function deletePresentation(id: string) {
  write(cache.filter((p) => p.id !== id));
  fetch(`/api/presentations/${id}`, { method: "DELETE" }).catch(() => {});
}

export function duplicatePresentation(id: string) {
  const p = getPresentation(id);
  if (!p) return;
  const copy: Presentation = structuredClone(p);
  copy.id = uid("p_");
  copy.createdAt = Date.now();
  if (typeof copy.title === "string") copy.title += " (copy)";
  else copy.title = Object.fromEntries(Object.entries(copy.title).map(([k, v]) => [k, `${v} (2)`]));
  return savePresentation(copy);
}
