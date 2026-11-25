// Uma função para info, eventos de uso e relatório (o plano da Vercel permite 12 funções).
// /api/info, /api/events e /api/audit chegam aqui pelos rewrites do vercel.json.
import info from "../_info.js";
import events from "../_events.js";
import audit from "../_audit.js";

const ROUTES = { info, events, audit };
export default async function handler(req, res) {
  const fn = ROUTES[req.query.action];
  if (!fn) return res.status(404).json({ error: "not_found" });
  return fn(req, res);
}
