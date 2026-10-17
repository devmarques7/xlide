import { useEffect, useRef, useState } from "react";
import type { Locale } from "./types";
import { uid } from "./utils";

export type Role = "presenter" | "remote" | "viewer";

export type SyncMessage =
  | { t: "state"; index: number; lang: Locale; total: number }
  | { t: "cmd"; action: "next" | "prev" | "goto" | "lang"; index?: number; lang?: Locale }
  | { t: "hello"; role: Role }
  | { t: "presence"; presenter: number; remote: number; viewer: number };

type Envelope = SyncMessage & { _id?: string };

export type SyncStatus = "connecting" | "live" | "local";

/**
 * Live channel for one presentation. Uses the XLIDE WebSocket relay so phones
 * on the network can join; BroadcastChannel keeps tabs in the same browser in
 * sync even without the server.
 */
export function useSync(room: string | undefined, role: Role, onMessage: (m: SyncMessage) => void) {
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const [presence, setPresence] = useState({ presenter: 0, remote: 0, viewer: 0 });
  const handler = useRef(onMessage);
  handler.current = onMessage;
  const sendRef = useRef<(m: SyncMessage) => void>(() => {});

  useEffect(() => {
    if (!room) return;
    const seen = new Set<string>();
    const deliver = (m: Envelope) => {
      if (m._id) {
        if (seen.has(m._id)) return;
        seen.add(m._id);
        // Forget the oldest ids only (clearing all could replay recent commands).
        if (seen.size > 600) for (const id of [...seen].slice(0, 200)) seen.delete(id);
      }
      if (m.t === "presence") setPresence({ presenter: m.presenter, remote: m.remote, viewer: m.viewer });
      handler.current(m);
    };

    const bc = "BroadcastChannel" in window ? new BroadcastChannel(`xlide:${room}`) : null;
    if (bc) bc.onmessage = (e) => deliver(e.data);

    const client = uid("c_");
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let pollTimer: ReturnType<typeof setTimeout>;
    let closed = false;
    let attempts = 0;
    let everOpened = false;
    let mode: "ws" | "poll" | "none" = "ws";
    let after = 0;
    let pollFails = 0;

    /* HTTP polling relay (Vercel serverless has no WebSockets). */
    const poll = async (first = false) => {
      if (closed) return;
      try {
        // Ask with an overlap margin: messages can land slightly out of order,
        // and duplicates are dropped by their id in deliver().
        const since = first ? 0 : Math.max(0, after - 20);
        const res = await fetch(`/api/sync/${encodeURIComponent(room)}?after=${since}&client=${client}&role=${role}`, { cache: "no-store" });
        if (res.status === 503 || res.status === 404 || !res.headers.get("content-type")?.includes("json")) {
          mode = "none";
          setStatus("local");
          return;
        }
        const data = await res.json();
        pollFails = 0;
        setStatus("live");
        if (first) {
          // Join: take the current slide, but don't replay old commands.
          for (const m of data.messages ?? []) if (m._id) seen.add(m._id);
          if (data.state) deliver({ ...data.state, _id: `join-${data.state._id ?? data.state._seq}` });
        } else {
          for (const m of data.messages ?? []) deliver({ ...m, _id: m._id ?? `m${m._seq}` });
        }
        if (data.presence) deliver(data.presence);
        after = Math.max(after, data.seq ?? 0);
        if (first) send({ t: "hello", role });
      } catch {
        if (++pollFails > 3) setStatus("local");
      }
      pollTimer = setTimeout(() => poll(), document.hidden ? 4000 : 900);
    };

    const startPolling = () => {
      if (mode === "poll" || closed) return;
      mode = "poll";
      ws?.close();
      poll(true);
    };

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      try {
        ws = new WebSocket(`${proto}://${location.host}/ws`);
      } catch {
        startPolling();
        return;
      }
      const openTimeout = setTimeout(() => !everOpened && startPolling(), 2500);
      ws.onopen = () => {
        clearTimeout(openTimeout);
        everOpened = true;
        attempts = 0;
        setStatus("live");
        ws!.send(JSON.stringify({ t: "join", room, role }));
        send({ t: "hello", role });
      };
      ws.onmessage = (e) => {
        try {
          deliver(JSON.parse(e.data));
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        clearTimeout(openTimeout);
        if (closed || mode !== "ws") return;
        if (!everOpened) return startPolling();
        setStatus("local");
        retry = setTimeout(connect, Math.min(10000, 1000 * 2 ** attempts++));
      };
    };

    const send = (m: SyncMessage) => {
      const env: Envelope = { ...m, _id: uid() };
      seen.add(env._id!);
      bc?.postMessage(env);
      if (mode === "ws" && ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(env));
      if (mode === "poll") {
        fetch(`/api/sync/${encodeURIComponent(room)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...env, _client: client, _role: role }),
        }).catch(() => {});
      }
    };
    sendRef.current = send;

    connect();
    bc?.postMessage({ t: "hello", role, _id: uid() });

    return () => {
      closed = true;
      clearTimeout(retry);
      clearTimeout(pollTimer);
      ws?.close();
      bc?.close();
    };
  }, [room, role]);

  return { status, presence, send: (m: SyncMessage) => sendRef.current(m) };
}

/** Public base URL for links/QR codes. Swaps localhost for the LAN address. */
export function usePublicOrigin() {
  const [origin, setOrigin] = useState(location.origin);
  const [isLocal, setIsLocal] = useState(false);
  useEffect(() => {
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
    setIsLocal(local);
    if (!local) return;
    fetch("/api/info")
      .then((r) => r.json())
      .then((info: { lan: string[]; port: number }) => {
        if (info.lan?.[0]) setOrigin(`${location.protocol}//${info.lan[0]}:${location.port || info.port}`);
      })
      .catch(() => {});
  }, []);
  return { origin, isLocal };
}

/** Absolute link to an app route, respecting hash routing on static hosts. */
export function appUrl(origin: string, path: string) {
  if (import.meta.env.VITE_HASH_ROUTER) return `${location.href.split("#")[0]}#${path}`;
  return `${origin}${path}`;
}
