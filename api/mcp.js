// MCP server (Streamable HTTP, stateless) for XLIDE boards.
// Connect a client to https://<host>/api/mcp?key=<XLIDE_MCP_KEY> (or send it as a Bearer token).
import { handleMcpBody, mcpAuthorized } from "../shared/board.js";
import { boardStore, MCP_KEY, originOf } from "./_boards.js";
import { needRedis, noStore } from "./_redis.js";
import { renderPreview } from "./_preview.js";

export default async function handler(req, res) {
  noStore(res);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).setHeader("Allow", "POST").end();
  if (!mcpAuthorized(req.headers, req.query, MCP_KEY)) return res.status(401).json({ error: "unauthorized" });
  if (needRedis(res)) return;
  const { status, body } = await handleMcpBody(req.body, boardStore, originOf(req), { renderPreview });
  if (!body) return res.status(status).end();
  res.status(status).json(body);
}
