import { needRedis, noStore, redis } from "../_redis.js";

export default async function handler(req, res) {
  noStore(res);
  if (needRedis(res)) return;
  if (req.method !== "GET") return res.status(405).end();
  const [ids] = await redis(["SMEMBERS", "xlide:ids"]);
  if (!ids?.length) return res.json([]);
  const [values] = await redis(["MGET", ...ids.map((id) => `xlide:p:${id}`)]);
  res.json(values.filter(Boolean).map((v) => JSON.parse(v)));
}
