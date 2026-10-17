// HTTP polling relay used on Vercel (serverless has no WebSockets).
// POST pushes a message; GET returns messages after a sequence number,
// the last presenter state and who is connected.
import { needRedis, noStore, redis } from "../_redis.js";

const TTL = 60 * 60 * 6; // rooms expire after 6h idle
const ALIVE_MS = 6000;

export default async function handler(req, res) {
  noStore(res);
  if (needRedis(res)) return;
  const room = String(req.query.room).slice(0, 80);
  const k = (s) => `xlide:room:${room}:${s}`;

  if (req.method === "POST") {
    const msg = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!msg || typeof msg.t !== "string") return res.status(400).end();
    // Only the presenter and paired remotes (passcode) may move the deck.
    if (msg._role === "viewer" && (msg.t === "state" || msg.t === "cmd")) return res.status(403).end();
    const seq = Number((await redis(["INCR", k("seq")]))[0]);
    const entry = JSON.stringify({ ...msg, _seq: seq });
    const ops = [
      ["RPUSH", k("log"), entry],
      ["LTRIM", k("log"), -60, -1],
      ["EXPIRE", k("log"), TTL],
      ["EXPIRE", k("seq"), TTL],
    ];
    if (msg.t === "state") ops.push(["SET", k("state"), entry, "EX", TTL]);
    await redis(...ops);
    return res.json({ seq });
  }

  if (req.method === "GET") {
    const after = Number(req.query.after ?? 0);
    const client = String(req.query.client ?? "");
    const role = String(req.query.role ?? "viewer");
    const now = Date.now();
    const [, , log, state, seq, members] = await redis(
      ["HSET", k("presence"), client, `${role}:${now}`],
      ["EXPIRE", k("presence"), TTL],
      ["LRANGE", k("log"), 0, -1],
      ["GET", k("state")],
      ["GET", k("seq")],
      ["HGETALL", k("presence")],
    );
    const presence = { t: "presence", presenter: 0, remote: 0, viewer: 0 };
    const stale = [];
    for (let i = 0; i < (members?.length ?? 0); i += 2) {
      const [r, ts] = members[i + 1].split(":");
      if (now - Number(ts) < ALIVE_MS) presence[r] = (presence[r] ?? 0) + 1;
      else stale.push(members[i]);
    }
    if (stale.length) redis(["HDEL", k("presence"), ...stale]).catch(() => {});
    const messages = (log ?? []).map((e) => JSON.parse(e)).filter((m) => m._seq > after && m._client !== client);
    // Highest sequence actually present in the log: a message whose number was
    // taken but not yet written is picked up on the next poll instead of lost.
    const logged = (log ?? []).reduce((m, e) => Math.max(m, JSON.parse(e)._seq ?? 0), 0);
    return res.json({ seq: logged, latest: Number(seq ?? 0), state: state ? JSON.parse(state) : null, messages, presence });
  }
  res.status(405).end();
}
