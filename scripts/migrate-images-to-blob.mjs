// Moves images from Redis (xlide:img:<id>) to Vercel Blob (xlide/img/<id>.<ext>), freeing Redis memory.
// Each image is copied and verified in Blob BEFORE its Redis key is deleted. URLs (/api/images/<id>) do not change.
// Usage: REDIS_URL=... BLOB_READ_WRITE_TOKEN=... node scripts/migrate-images-to-blob.mjs [--dry]
import { createClient } from "redis";
import { put, head } from "@vercel/blob";

const DRY = process.argv.includes("--dry");
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const r = createClient({ url: process.env.REDIS_URL });
await r.connect();
console.log((await r.info("memory")).split("\n").filter((l) => /used_memory_human|maxmemory_human/.test(l)).join(" "));
let n = 0, bytes = 0;
for await (const batch of r.scanIterator({ MATCH: "xlide:img:*", COUNT: 100 })) {
  for (const key of [].concat(batch)) {
    const raw = await r.get(key);
    if (!raw) continue;
    const { type, data } = JSON.parse(raw);
    const id = key.slice("xlide:img:".length);
    bytes += raw.length; n++;
    if (DRY) continue;
    const path = `xlide/img/${id}.${EXT[type] || "jpg"}`;
    await put(path, Buffer.from(data, "base64"), { access: "public", contentType: type, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000 });
    const h = await head(path);
    if (h?.size === Buffer.from(data, "base64").length) await r.del(key);
    else console.log("NOT deleted (verify failed):", key);
  }
}
console.log(`${DRY ? "would move" : "moved"} ${n} images · ${(bytes / 1e6).toFixed(1)} MB`);
await r.quit();
