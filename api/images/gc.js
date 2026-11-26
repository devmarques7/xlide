// Image clean-up (Redis). Images are kept only while a board or a presentation points to them.
// GET  /api/images/gc?key=<chave de admin>               -> dry run: what would be deleted + memory
// POST /api/images/gc?key=<chave de admin> {confirm:true} -> deletes only images no board/presentation uses
import { requireActor } from "../_auth.js";
import { needRedis, noStore, redis } from "../_redis.js";

async function scan(match) {
  const keys = [];
  let cursor = "0";
  do {
    const [[next, batch]] = await redis(["SCAN", cursor, "MATCH", match, "COUNT", "500"]);
    cursor = String(next);
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

export default async function handler(req, res) {
  noStore(res);
  if (needRedis(res)) return;
  if (!(await requireActor(req, res, "admin"))) return;
  const used = new Set();
  for (const k of [...(await scan("xlide:b:*")), ...(await scan("xlide:p:*"))]) {
    const [v] = await redis(["GET", k]);
    for (const m of String(v ?? "").matchAll(/api\/images\/([a-f0-9]{20})/g)) used.add(m[1]);
  }
  const imgs = await scan("xlide:img:*");
  const orphans = [];
  let orphanBytes = 0, usedBytes = 0;
  for (const k of imgs) {
    const [len] = await redis(["STRLEN", k]);
    if (used.has(k.slice("xlide:img:".length))) usedBytes += Number(len); else { orphans.push(k); orphanBytes += Number(len); }
  }
  const [info] = await redis(["INFO", "memory"]);
  const mem = Object.fromEntries(String(info).split(/\r?\n/).filter((l) => /^(used_memory_human|maxmemory_human):/.test(l)).map((l) => l.split(":")));
  let deleted = 0;
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  if (req.method === "POST" && body.confirm === true) {
    for (let i = 0; i < orphans.length; i += 50) { await redis(["DEL", ...orphans.slice(i, i + 50)]); deleted += orphans.slice(i, i + 50).length; }
  }
  res.json({ memory: mem, images: imgs.length, usedImages: imgs.length - orphans.length, usedMB: +(usedBytes / 1e6).toFixed(2),
    orphanImages: orphans.length, orphanMB: +(orphanBytes / 1e6).toFixed(2), deleted });
}
