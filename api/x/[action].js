// Uma função para info, eventos de uso e relatório (o plano da Vercel permite 12 funções).
// /api/info, /api/events e /api/audit chegam aqui pelos rewrites do vercel.json.
import info from "../_info.js";
import events from "../_events.js";
import audit from "../_audit.js";
import fonts from "../_fonts.js";
import backgrounds from "../_backgrounds.js";

// /.well-known/*: o app não usa OAuth. Sem isto, a página do app (HTML) voltava aqui e o cliente MCP
// quebrava com "SyntaxError" ao procurar OAuth depois de um 401.
const wellknown = (_req, res) => res.status(404).json({ error: "not_found", message: "XLIDE não usa OAuth: conecte com o link …/api/mcp?key=xl_… (Configurações → Conectar ao Claude)." });
const ROUTES = { info, events, audit, wellknown, fonts, backgrounds };
export default async function handler(req, res) {
  const fn = ROUTES[req.query.action];
  if (!fn) return res.status(404).json({ error: "not_found" });
  return fn(req, res);
}
