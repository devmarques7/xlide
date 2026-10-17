// GET -> the stored image bytes (immutable: the id is a hash of the content).
import { needRedis, redis } from "../_redis.js";

export default async function handler(req, res) {
  if (needRedis(res)) return;
  const id = String(req.query.id).replace(/[^a-f0-9]/g, "");
  const [raw] = await redis(["GET", `xlide:img:${id}`]);
  if (!raw) return res.status(404).end();
  const { type, data } = JSON.parse(raw);
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.status(200).send(Buffer.from(data, "base64"));
}
