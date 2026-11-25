// Relatório de uso e auditoria (xlide_audit_report). Só para quem está logado (token do Supabase) ou com a chave MCP.
import { auditReport, hasSupabase, userFromToken } from "./_supabase.js";
import { MCP_KEY } from "./_boards.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).end();
  if (!hasSupabase) return res.status(503).json({ error: "supabase_not_configured" });
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token !== MCP_KEY && !(await userFromToken(token))) return res.status(401).json({ error: "unauthorized" });
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  res.json(await auditReport(days));
}
