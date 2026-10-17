// Storage for the serverless API. Supports both kinds of Redis Vercel offers:
// - Upstash (REST): KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*)
// - Redis over TCP (Vercel "Redis", Redis Cloud, any provider): REDIS_URL (or KV_URL)
import { createClient } from "redis";

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TCP_URL = process.env.REDIS_URL || process.env.KV_URL;

export const backend = REST_URL && REST_TOKEN ? "upstash-rest" : TCP_URL ? "redis-tcp" : "none";
export const hasRedis = backend !== "none";

let tcp; // reused across invocations of a warm function
async function tcpClient() {
  if (!tcp) {
    tcp = createClient({ url: TCP_URL, socket: { connectTimeout: 5000 } });
    tcp.on("error", () => {});
    await tcp.connect();
  }
  return tcp;
}

/** Run commands in order; returns one result per command (Upstash pipeline shape). */
export async function redis(...pipeline) {
  if (backend === "upstash-rest") {
    const res = await fetch(`${REST_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(pipeline),
    });
    if (!res.ok) throw new Error(`redis ${res.status}`);
    const out = await res.json();
    return out.map((r) => r.result);
  }
  const c = await tcpClient();
  const out = [];
  for (const cmd of pipeline) out.push(await c.sendCommand(cmd.map(String)));
  return out;
}

export function noStore(res) {
  res.setHeader("Cache-Control", "no-store");
}

export function needRedis(res) {
  if (hasRedis) return false;
  res.status(503).json({ error: "storage_not_configured", hint: "Connect a Redis database to the Vercel project (Storage tab) and redeploy." });
  return true;
}
