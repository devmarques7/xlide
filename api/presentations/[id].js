import { needRedis, noStore, redis } from "../_redis.js";
import { deckStore, hasSupabase } from "../_supabase.js";

// Decks: no Supabase quando configurado (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY), senão no Redis.
export default async function handler(req, res) {
  noStore(res);
  if (needRedis(res, { supabaseOk: true })) return;
  const { id } = req.query;
  const key = `xlide:p:${id}`;
  if (req.method === "GET") {
    if (hasSupabase) { const d = await deckStore.get(id); return d ? res.json(d) : res.status(404).json({ error: "not_found" }); }
    const [v] = await redis(["GET", key]);
    return v ? res.json(JSON.parse(v)) : res.status(404).json({ error: "not_found" });
  }
  if (req.method === "PUT") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || body.id !== id) return res.status(400).json({ error: "invalid" });
    if (hasSupabase) await deckStore.put(body, { kind: body.music ? "song" : "deck" });
    else await redis(["SET", key, JSON.stringify(body)], ["SADD", "xlide:ids", id]);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    if (hasSupabase) await deckStore.del(id);
    else await redis(["DEL", key], ["SREM", "xlide:ids", id]);
    return res.json({ ok: true });
  }
  res.status(405).end();
}
