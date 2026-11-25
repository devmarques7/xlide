// Eventos de uso (páginas, buscas sem resultado, erros, saídas) → xlide_events.
// Sem Supabase configurado, aceita e descarta (o app não quebra).
import { hasSupabase, insertEvents, userFromToken } from "./_supabase.js";

const KINDS = new Set(["page_view", "leave", "search", "search_empty", "error", "action", "retry"]);
const clip = (s, n) => (s == null ? null : String(s).slice(0, n));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (!hasSupabase) return res.status(204).end();
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const user = await userFromToken((req.headers.authorization || "").replace(/^Bearer\s+/i, ""));
  const rows = (Array.isArray(body.events) ? body.events : []).slice(0, 50).filter((e) => KINDS.has(e?.kind)).map((e) => ({
    user_id: user, session: clip(body.session, 64) || "anon", kind: e.kind, path: clip(e.path, 200), target: clip(e.target, 300),
    ms: Number.isFinite(e.ms) ? Math.min(2147483647, Math.round(e.ms)) : null, meta: e.meta && typeof e.meta === "object" ? e.meta : {},
  }));
  if (rows.length) await insertEvents(rows).catch(() => {});
  res.status(204).end();
}
