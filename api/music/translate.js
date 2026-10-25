// POST { lines: string[], target: "nl", source?: "auto" } -> { lines: string[] }
import { noStore } from "../_redis.js";
import { translateLines } from "../_music.js";

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== "POST") return res.status(405).end();
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const lines = Array.isArray(body?.lines) ? body.lines.map(String).slice(0, 400) : null;
  if (!lines || !/^[a-zA-Z-]{2,8}$/.test(body?.target ?? "")) return res.status(400).json({ error: "bad_request" });
  try {
    res.json({ lines: await translateLines(lines, body.target, body.source || "auto") });
  } catch (e) {
    res.status(502).json({ error: "translate_failed", detail: String(e?.message ?? e) });
  }
}
