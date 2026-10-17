// Minimal Upstash Redis REST client (no dependency). Vercel's Upstash/KV
// integration provides KV_REST_API_URL + KV_REST_API_TOKEN automatically.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasRedis = Boolean(URL_ && TOKEN);

export async function redis(...pipeline) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(pipeline),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = await res.json();
  return out.map((r) => r.result);
}

export function noStore(res) {
  res.setHeader("Cache-Control", "no-store");
}

export function needRedis(res) {
  if (hasRedis) return false;
  res.status(503).json({ error: "storage_not_configured" });
  return true;
}
