// XLIDE server: stores presentations (JSON file) and relays live sync
// messages between presenter, phone remotes and audience viewers.
import express from "express";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { WebSocketServer } from "ws";
import { getLyrics, searchBackgrounds, translateLines } from "../api/_music.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROD = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT ?? (PROD ? 3000 : process.env.API_PORT ?? 3001));
const DATA_FILE = path.join(__dirname, "data.json");
const DIST = path.join(__dirname, "..", "dist");

let db = {};
try {
  db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch {
  db = {};
}
let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DATA_FILE, JSON.stringify(db), () => {}), 300);
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
}

const app = express();
app.use(express.json({ limit: "10mb" }));

app.get("/api/info", (_req, res) => {
  res.json({ name: "XLIDE", lan: lanAddresses(), port: PROD ? PORT : 5173 });
});
app.get("/api/presentations", (_req, res) => res.json(Object.values(db)));
app.get("/api/presentations/:id", (req, res) => {
  const p = db[req.params.id];
  if (!p) return res.status(404).json({ error: "not_found" });
  res.json(p);
});
app.put("/api/presentations/:id", (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || body.id !== req.params.id) {
    return res.status(400).json({ error: "invalid" });
  }
  db[req.params.id] = body;
  persist();
  res.json({ ok: true });
});
app.delete("/api/presentations/:id", (req, res) => {
  delete db[req.params.id];
  persist();
  res.json({ ok: true });
});

// Images uploaded from the editor, stored as files next to data.json.
const IMG_DIR = path.join(__dirname, "images");
fs.mkdirSync(IMG_DIR, { recursive: true });
app.post("/api/images", (req, res) => {
  const { data, type } = req.body ?? {};
  if (typeof data !== "string") return res.status(400).json({ error: "invalid_image" });
  const id = createHash("sha1").update(data).digest("hex").slice(0, 20);
  fs.writeFileSync(path.join(IMG_DIR, id), JSON.stringify({ type: type || "image/jpeg", data }));
  res.json({ url: `/api/images/${id}` });
});
app.get("/api/images/:id", (req, res) => {
  const file = path.join(IMG_DIR, req.params.id.replace(/[^a-f0-9]/g, ""));
  if (!fs.existsSync(file)) return res.status(404).end();
  const { type, data } = JSON.parse(fs.readFileSync(file, "utf8"));
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.type(type).send(Buffer.from(data, "base64"));
});

// Music slides: same handlers as the Vercel functions in api/music.
app.get("/api/music/lyrics", async (req, res) => {
  try {
    res.json(await getLyrics(req.query.url, req.query.lang));
  } catch (e) {
    res.status(502).json({ error: "youtube_failed", detail: String(e?.message ?? e) });
  }
});
app.post("/api/music/translate", async (req, res) => {
  const { lines, target, source } = req.body ?? {};
  if (!Array.isArray(lines) || typeof target !== "string") return res.status(400).json({ error: "bad_request" });
  try {
    res.json({ lines: await translateLines(lines.map(String).slice(0, 400), target, source || "auto") });
  } catch (e) {
    res.status(502).json({ error: "translate_failed", detail: String(e?.message ?? e) });
  }
});
app.get("/api/music/backgrounds", async (req, res) => {
  res.json(await searchBackgrounds(req.query.q, process.env.PEXELS_API_KEY));
});

if (PROD) {
  app.use(express.static(DIST));
  app.get(/^(?!\/api|\/ws).*/, (_req, res) => res.sendFile(path.join(DIST, "index.html")));
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

/** room -> { clients: Set<ws>, state: object | null } */
const rooms = new Map();

function room(name) {
  if (!rooms.has(name)) rooms.set(name, { clients: new Set(), state: null });
  return rooms.get(name);
}

function presence(r) {
  const count = { presenter: 0, remote: 0, viewer: 0 };
  for (const c of r.clients) count[c.role] = (count[c.role] ?? 0) + 1;
  return { t: "presence", ...count };
}

function broadcast(r, msg, except) {
  const data = JSON.stringify(msg);
  for (const c of r.clients) if (c !== except && c.readyState === 1) c.send(data);
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.t === "join" && typeof msg.room === "string") {
      ws.room = msg.room;
      ws.role = msg.role ?? "viewer";
      const r = room(ws.room);
      r.clients.add(ws);
      if (r.state) ws.send(JSON.stringify(r.state));
      broadcast(r, presence(r));
      return;
    }
    if (!ws.room) return;
    // Only the presenter and paired remotes (passcode) may move the deck.
    if (ws.role === "viewer" && (msg.t === "state" || msg.t === "cmd")) return;
    const r = room(ws.room);
    if (msg.t === "state") r.state = msg;
    broadcast(r, msg, ws);
  });
  ws.on("close", () => {
    if (!ws.room) return;
    const r = room(ws.room);
    r.clients.delete(ws);
    if (r.clients.size === 0) rooms.delete(ws.room);
    else broadcast(r, presence(r));
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`XLIDE ${PROD ? "app" : "api"} on http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`  LAN: http://${ip}:${PROD ? PORT : 5173}`);
});
