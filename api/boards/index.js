import { boardStore } from "../_boards.js";
import { needRedis, noStore } from "../_redis.js";
import { guard } from "../_auth.js";

export default async function handler(req, res) {
  noStore(res);
  if (needRedis(res, { supabaseOk: true })) return;
  if (req.method !== "GET") return res.status(405).end();
  if (!(await guard(req, res))) return;
  res.json(await boardStore.list());
}
