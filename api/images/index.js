// POST { data: base64, type } -> stores one compressed image, returns its URL.
// With a Vercel Blob store connected (BLOB_READ_WRITE_TOKEN) images go to Blob;
// otherwise they fall back to Redis. The URL is the same either way: /api/images/<id>.
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { needRedis, noStore, redis } from "../_redis.js";
import { guard } from "../_auth.js";

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const blobPath = (id) => `xlide/img/${id}`;

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== "POST") return res.status(405).end();
  if (!(await guard(req, res))) return;
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const data = body?.data;
  const type = /^image\/(jpeg|png|webp|gif)$/.test(body?.type) ? body.type : "image/jpeg";
  if (typeof data !== "string" || data.length > 4_000_000) return res.status(400).json({ error: "invalid_image" });
  const id = createHash("sha1").update(data).digest("hex").slice(0, 20);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(`${blobPath(id)}.${EXT[type]}`, Buffer.from(data, "base64"), {
        access: "public", contentType: type, addRandomSuffix: false, allowOverwrite: true,
        cacheControlMaxAge: 31536000,
      });
      return res.json({ url: `/api/images/${id}` });
    } catch (e) {
      return res.status(502).json({ error: "blob_upload_failed", detail: String(e?.message || e) });
    }
  }
  if (needRedis(res)) return;
  await redis(["SET", `xlide:img:${id}`, JSON.stringify({ type, data })]);
  res.json({ url: `/api/images/${id}` });
}
