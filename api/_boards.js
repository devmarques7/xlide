// Board storage on Redis, shared by api/boards and the MCP endpoint.
import { redis } from "./_redis.js";

const key = (id) => `xlide:b:${id}`;

export const boardStore = {
  async list() {
    const [ids] = await redis(["SMEMBERS", "xlide:bids"]);
    if (!ids?.length) return [];
    const [values] = await redis(["MGET", ...ids.map(key)]);
    return values.filter(Boolean).map((v) => JSON.parse(v));
  },
  async get(id) {
    const [v] = await redis(["GET", key(id)]);
    return v ? JSON.parse(v) : null;
  },
  async put(b) {
    await redis(["SET", key(b.id), JSON.stringify(b)], ["SADD", "xlide:bids", b.id]);
  },
  async del(id) {
    await redis(["DEL", key(id)], ["SREM", "xlide:bids", id]);
  },
};

/** Key for the MCP endpoint: XLIDE_MCP_KEY, or the app passcode when unset. */
export const MCP_KEY = process.env.XLIDE_MCP_KEY || "1423";

export function originOf(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}
