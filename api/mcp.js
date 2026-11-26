// MCP server (Streamable HTTP, stateless) for XLIDE boards.
// Connect a client to https://<host>/api/mcp?key=<sua chave xl_…> (or send it as a Bearer token).
// Com o Supabase, cada membro usa a própria chave (Equipe → Minha chave do MCP); sem ele, XLIDE_MCP_KEY ou 1423.
import { handleMcpBody } from "../shared/board.js";
import { boardStore, originOf } from "./_boards.js";
import { requireActor, runAs } from "./_auth.js";
import { needRedis, noStore } from "./_redis.js";
import { renderPreview } from "./_preview.js";
import { callLiveTool, LIVE_INSTRUCTIONS, LIVE_TOOLS } from "./_live.js";

export default async function handler(req, res) {
  noStore(res);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).setHeader("Allow", "POST").end();
  const actor = await requireActor(req, res, "edit");
  if (!actor) return;
  if (needRedis(res, { supabaseOk: true })) return;
  const { status, body } = await runAs(actor, () => handleMcpBody(req.body, boardStore, originOf(req), { renderPreview, extraTools: LIVE_TOOLS, extraCall: callLiveTool, extraInstructions: LIVE_INSTRUCTIONS }));
  if (!body) return res.status(status).end();
  res.status(status).json(body);
}
