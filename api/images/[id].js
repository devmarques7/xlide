// GET -> the stored image (immutable: the id is a hash of the content).
// Older images live in Redis; newer ones in Vercel Blob (redirect to the public Blob URL).
import { list } from "@vercel/blob";
import { hasRedis, redis } from "../_redis.js";

export default async function handler(req, res) {
  const id = String(req.query.id).replace(/[^a-f0-9]/g, "");
  if (!id) return res.status(404).end();
  if (hasRedis) {
    const [raw] = await redis(["GET", `xlide:img:${id}`]).catch(() => [null]);
    if (raw) {
      const { type, data } = JSON.parse(raw);
      res.setHeader("Content-Type", type);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.status(200).send(Buffer.from(data, "base64"));
    }
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { blobs } = await list({ prefix: `xlide/img/${id}.`, limit: 1 });
    if (blobs[0]) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.redirect(308, blobs[0].url);
    }
  }
  res.status(404).end();
}
