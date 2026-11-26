import { boardStore, originOf } from "../_boards.js";
import { renderPreview } from "../_preview.js";
import { needRedis, noStore } from "../_redis.js";
import { guard } from "../_auth.js";

export default async function handler(req, res) {
  noStore(res);
  if (needRedis(res, { supabaseOk: true })) return;
  const { id } = req.query;
  if (req.method === "GET" && req.query.preview) {
    // PNG of the map, moodboard or kanban (for AI tools and quick looks).
    const b = await boardStore.get(id);
    if (!b) return res.status(404).json({ error: "not_found" });
    const view = ["map", "moodboard", "kanban"].includes(req.query.preview) ? req.query.preview : "map";
    const { png } = await renderPreview(b, view, originOf(req), Number(req.query.width) || 1600);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    return res.end(png);
  }
  if (req.method === "GET") {
    const b = await boardStore.get(id);
    return b ? res.json(b) : res.status(404).json({ error: "not_found" });
  }
  if ((req.method === "PUT" || req.method === "DELETE") && !(await guard(req, res, "edit"))) return;
  if (req.method === "PUT") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || body.id !== id || !Array.isArray(body.nodes)) return res.status(400).json({ error: "invalid" });
    await boardStore.put(body);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    await boardStore.del(id);
    return res.json({ ok: true });
  }
  res.status(405).end();
}
