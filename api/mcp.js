// MCP server (Streamable HTTP, stateless) for XLIDE boards.
// Connect a client to https://<host>/api/mcp?key=<sua chave xl_…> (or send it as a Bearer token).
// Com o Supabase, cada membro usa a própria chave (Equipe → Minha chave do MCP); sem ele, XLIDE_MCP_KEY ou 1423.
import { handleMcpBody } from "../shared/board.js";
import { boardStore, originOf } from "./_boards.js";
import { requireActor, runAs } from "./_auth.js";
import { needRedis, noStore } from "./_redis.js";
import { renderPreview } from "./_preview.js";
import { callLiveTool, LIVE_INSTRUCTIONS, LIVE_TOOLS } from "./_live.js";
import { CONTEXT_MD, SKILL_MD } from "../shared/skill.js";

// A skill especialista vai junto com a conexão: ferramenta read_skill, recursos e um prompt "especialista".
const RESOURCES = [
  { uri: "xlide://skill/especialista", name: "XLIDE · especialista (skill)", mimeType: "text/markdown", text: SKILL_MD },
  { uri: "xlide://skill/contexto", name: "XLIDE · documento de contexto", mimeType: "text/markdown", text: CONTEXT_MD },
];
const PROMPTS = [{ name: "especialista", title: "XLIDE · especialista", description: "Ativa o especialista do XLIDE (designer, programas, rotas).", text: `${SKILL_MD}\n\n---\n\n${CONTEXT_MD}\n\nAgora você é o especialista do XLIDE. Pergunte o que a pessoa quer fazer.` }];

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
  const { status, body } = await runAs(actor, () => handleMcpBody(req.body, boardStore, originOf(req), { renderPreview, extraTools: LIVE_TOOLS, extraCall: callLiveTool, extraInstructions: LIVE_INSTRUCTIONS, resources: RESOURCES, prompts: PROMPTS }));
  if (!body) return res.status(status).end();
  res.status(status).json(body);
}
