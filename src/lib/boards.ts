import { useEffect, useSyncExternalStore } from "react";
import { layoutBoard, newId, normalizeBoard, type Board } from "../../shared/board.js";

export type { Board, BoardEdge, BoardNode, NodeKind } from "../../shared/board.js";

/* Boards live on the server (so the MCP can write them) and are mirrored in
   localStorage, so they still open offline or on a static host. */

const KEY = "xlide.boards";
type Listener = () => void;

function read(): Board[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Board[]) : [];
  } catch {
    return [];
  }
}

let cache: Board[] = read();
const listeners = new Set<Listener>();
/** Boards with local edits not yet confirmed by the server: polling won't overwrite them. */
const dirty = new Map<string, number>();

function write(next: Board[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota — keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

window.addEventListener("storage", (e) => {
  if (e.key === KEY) {
    cache = read();
    listeners.forEach((l) => l());
  }
});

export function useBoards() {
  return useSyncExternalStore(subscribe, () => cache);
}

export function useBoard(id: string | undefined) {
  const all = useBoards();
  useEffect(() => {
    if (!id) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!document.hidden) await pullBoard(id);
      if (!stop) timer = setTimeout(tick, 2500);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);
  return all.find((b) => b.id === id);
}

function merge(remote: Board) {
  const local = cache.find((b) => b.id === remote.id);
  if (local && (dirty.has(remote.id) || local.updatedAt >= remote.updatedAt)) return;
  const b = normalizeBoard(remote);
  layoutBoard(b);
  write(local ? cache.map((x) => (x.id === b.id ? b : x)) : [b, ...cache]);
}

export async function pullBoard(id: string) {
  try {
    const res = await fetch(`/api/boards/${id}`, { cache: "no-store" });
    if (res.ok && res.headers.get("content-type")?.includes("json")) merge(await res.json());
  } catch {
    /* offline */
  }
}

export async function syncBoards() {
  try {
    const res = await fetch("/api/boards", { cache: "no-store" });
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return;
    const remote: Board[] = await res.json();
    for (const r of remote) merge(r);
    for (const b of cache) {
      const r = remote.find((x) => x.id === b.id);
      if (!r || b.updatedAt > r.updatedAt) push(b);
    }
  } catch {
    /* offline */
  }
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
function push(b: Board) {
  clearTimeout(timers.get(b.id));
  timers.set(
    b.id,
    setTimeout(async () => {
      const stamp = b.updatedAt;
      try {
        await fetch(`/api/boards/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      } catch {
        /* offline: stays local */
      }
      if (dirty.get(b.id) === stamp) dirty.delete(b.id);
    }, 400),
  );
}

export function saveBoard(b: Board) {
  const next = { ...b, updatedAt: Date.now() };
  dirty.set(next.id, next.updatedAt);
  write(cache.some((x) => x.id === b.id) ? cache.map((x) => (x.id === b.id ? next : x)) : [next, ...cache]);
  push(next);
  return next;
}

export function updateBoard(id: string, fn: (b: Board) => Board) {
  const b = cache.find((x) => x.id === id);
  if (b) return saveBoard(fn(structuredClone(b)));
}

export function deleteBoard(id: string) {
  write(cache.filter((b) => b.id !== id));
  fetch(`/api/boards/${id}`, { method: "DELETE" }).catch(() => {});
}

export function createBoard(title: string, idea = "") {
  const b = normalizeBoard({ id: newId("b_"), title, idea });
  b.nodes.push({ id: "idea", kind: "idea", title, text: idea, x: 0, y: 0 });
  return saveBoard(b);
}
