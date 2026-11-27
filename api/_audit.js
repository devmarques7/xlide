// Auditoria (Configurações → Auditoria): só admin. Sessão do app (Bearer do Supabase) ou a chave do MCP de um admin.
//   GET /api/audit?days=30                     → relatório (xlide_audit_report)
//   GET /api/audit?feed=1&days=7&person=<uuid> → linha do tempo do que cada pessoa fez (xlide_audit_feed)
import { auditFeed, auditReport, hasSupabase } from "./_supabase.js";
import { requireActor } from "./_auth.js";

const UUID = /^[0-9a-f-]{36}$/;
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).end();
  if (!hasSupabase) return res.status(503).json({ error: "supabase_not_configured" });
  if (!(await requireActor(req, res, "admin"))) return;
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  try {
    if (req.query.feed) {
      const person = UUID.test(String(req.query.person || "")) ? String(req.query.person) : null;
      return res.json(await auditFeed(days, person, Math.min(1000, Math.max(20, Number(req.query.limit) || 300))));
    }
    res.json(await auditReport(days));
  } catch (e) {
    res.status(502).json({ error: "report_failed", message: String(e?.message ?? e).slice(0, 200) });
  }
}
