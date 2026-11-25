import { needRedis, noStore, redis } from "../_redis.js";
import { deckStore, hasSupabase } from "../_supabase.js";

export default async function handler(req, res) {
  noStore(res);
  if (needRedis(res, { supabaseOk: true })) return;
  if (req.method !== "GET") return res.status(405).end();
  if (hasSupabase) return res.json(await deckStore.list());
  const [ids] = await redis(["SMEMBERS", "xlide:ids"]);
  if (!ids?.length) return res.json([]);
  const [values] = await redis(["MGET", ...ids.map((id) => `xlide:p:${id}`)]);
  res.json(values.filter(Boolean).map((v) => JSON.parse(v)));
}
