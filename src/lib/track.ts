import { supabase } from "./supabase";

/* Uso do app → /api/events (xlide_events). Base do relatório de auditoria em /audit:
   páginas mais abertas, onde travam (erros, tentativas repetidas), onde saem e o que não encontram.
   Sem Supabase o servidor descarta; nada de conteúdo dos decks é enviado, só caminhos e termos de busca. */
type Ev = { kind: "page_view" | "leave" | "search" | "search_empty" | "error" | "action" | "retry"; path?: string; target?: string; ms?: number; meta?: Record<string, unknown> };
const SKEY = "xlide.session";
const session = (() => { try { let s = sessionStorage.getItem(SKEY); if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(SKEY, s); } return s; } catch { return "nostorage"; } })();
let queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let pageAt = Date.now(), pagePath = "";
const lastActions = new Map<string, number>();

async function flush(beacon = false) {
  if (!queue.length) return;
  const events = queue.splice(0, 50);
  const body = JSON.stringify({ session, events });
  if (beacon && navigator.sendBeacon) { navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" })); return; }
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body, keepalive: true }).catch(() => {});
}
export function track(e: Ev) {
  queue.push({ path: location.pathname, ...e });
  clearTimeout(timer);
  timer = setTimeout(() => flush(), 2000);
}
/** Troca de página: fecha o tempo da anterior e abre a nova. */
export function trackPage(path: string) {
  if (path === pagePath) return;
  if (pagePath) track({ kind: "leave", path: pagePath, ms: Date.now() - pageAt });
  pagePath = path; pageAt = Date.now();
  track({ kind: "page_view", path });
}
/** Busca: termo sem resultado vira "não encontram". */
export function trackSearch(q: string, results: number) {
  const t = q.trim(); if (t.length < 2) return;
  track({ kind: results ? "search" : "search_empty", target: t.slice(0, 120), meta: { results } });
}
/** Mesma ação repetida em pouco tempo = dificuldade. */
export function trackAction(name: string) {
  const now = Date.now(), last = lastActions.get(name) || 0;
  lastActions.set(name, now);
  track({ kind: now - last < 4000 ? "retry" : "action", target: name });
}
let started = false;
export function startTracking() {
  if (started) return; started = true;
  addEventListener("error", (e) => track({ kind: "error", target: String(e.message || "erro").slice(0, 200) }));
  addEventListener("unhandledrejection", (e) => track({ kind: "error", target: String((e.reason && (e.reason.message || e.reason)) || "promise").slice(0, 200) }));
  addEventListener("pagehide", () => { if (pagePath) queue.push({ kind: "leave", path: pagePath, ms: Date.now() - pageAt }); flush(true); });
}
