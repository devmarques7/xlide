import { boardStore } from "../_boards.js";
import { needRedis, noStore } from "../_redis.js";

export default async function handler(req, res) {
  noStore(res);
  if (needRedis(res)) return;
  if (req.method !== "GET") return res.status(405).end();
  res.json(await boardStore.list());
}
