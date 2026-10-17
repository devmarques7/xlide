// POST { data: base64, type } -> stores one compressed image, returns its URL.
import { createHash } from "node:crypto";
import { needRedis, noStore, redis } from "../_redis.js";

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== "POST") return res.status(405).end();
  if (needRedis(res)) return;
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const data = body?.data;
  const type = /^image\/(jpeg|png|webp|gif)$/.test(body?.type) ? body.type : "image/jpeg";
  if (typeof data !== "string" || data.length > 4_000_000) return res.status(400).json({ error: "invalid_image" });
  const id = createHash("sha1").update(data).digest("hex").slice(0, 20);
  await redis(["SET", `xlide:img:${id}`, JSON.stringify({ type, data })]);
  res.json({ url: `/api/images/${id}` });
}
