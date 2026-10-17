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
        if (seen.size > 500) seen.clear();
      }
      if (m.t === "presence") setPresence({ presenter: m.presenter, remote: m.remote, viewer: m.viewer });
      handler.current(m);
    };

    const bc = "BroadcastChannel" in window ? new BroadcastChannel(`xlide:${room}`) : null;
    if (bc) bc.onmessage = (e) => deliver(e.data);

    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let closed = false;
    let attempts = 0;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      try {
        ws = new WebSocket(`${proto}://${location.host}/ws`);
      } catch {
        setStatus("local");
        return;
      }
      ws.onopen = () => {
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
        if (closed) return;
        setStatus("local");
        retry = setTimeout(connect, Math.min(10000, 1000 * 2 ** attempts++));
      };
    };

    const send = (m: SyncMessage) => {
      const env: Envelope = { ...m, _id: uid() };
      seen.add(env._id!);
      bc?.postMessage(env);
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(env));
    };
    sendRef.current = send;

    connect();
    bc?.postMessage({ t: "hello", role, _id: uid() });

    return () => {
      closed = true;
      clearTimeout(retry);
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
