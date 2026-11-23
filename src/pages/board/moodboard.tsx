import {
  ArrowUpRight, BringToFront, Check, Circle, Copy, Eye, Hand, ImagePlus, Link2, ListTodo, Maximize, Minus, MousePointer2, MoveRight,
  Palette, Pencil, Plus, Redo2, SendToBack, Slash, Square, StickyNote, Trash2, Triangle, Type, Undo2, Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { newId, parseVideo } from "../../../shared/board.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BoardNode } from "@/lib/boards";
import { fontStack, useBrandFonts } from "@/lib/brand-fonts";
import { uploadImage } from "@/lib/images";
import { luminance, parseWeights, WEIGHT_NAMES } from "../../../shared/brand.js";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import type { MoodItem, MoodType, ShapeKind } from "../../../shared/board.js";
import { Linkify } from "./cards";
import { VideoTile } from "./inline-video";
import { ReelPlayer } from "./reel-player";

export interface View { x: number; y: number; z: number }
type Tool = "select" | "hand" | "pencil" | "text" | ShapeKind;
type Box = { x: number; y: number; w: number; h: number };

const INK = "#161615";
const PAPER = "#f3f2ee";
const COLORS = ["#161615", "#ffffff", "#e0512b", "#d93d3d", "#f2c94c", "#3e8e5a", "#2f6fd6", "#8a8a85"];
const WIDTHS = [2, 4, 8, 14];
const TEXT_SIZE: Record<string, string> = { sm: "14px", md: "20px", lg: "34px", xl: "60px" };
/** Cards whose height follows their text: the size you drag is the minimum, the text is never cut. */
const GROWS = new Set<MoodType>(["note", "todo", "link", "text", "color"]);
const clampZ = (z: number) => Math.max(0.1, Math.min(4, z));
const isImageUrl = (s: string) => /^https?:\/\/\S+\.(png|jpe?g|webp|gif|avif|svg)(\?\S*)?$/i.test(s.trim()) || /^data:image\//.test(s);
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());
const domainOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

/** Smooth path through the points (quadratic curves through the midpoints). */
function smoothPath(pts: [number, number][]) {
  if (!pts.length) return "";
  if (pts.length < 3) return `M${pts[0]![0]},${pts[0]![1]} ` + pts.map((p) => `L${p[0]},${p[1]}`).join(" ");
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]!, [nx, ny] = pts[i + 1]!;
    d += ` Q${x},${y} ${(x + nx) / 2},${(y + ny) / 2}`;
  }
  const last = pts[pts.length - 1]!;
  return d + ` L${last[0]},${last[1]}`;
}
const pairs = (flat: number[] = []) => {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i]!, flat[i + 1]!]);
  return out;
};
const imageSize = (src: string) =>
  new Promise<{ w: number; h: number }>((res) => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth || 4, h: img.naturalHeight || 3 });
    img.onerror = () => res({ w: 4, h: 3 });
    img.src = src;
  });

interface Props {
  /** Items as this person sees them (maybe translated). */
  items: MoodItem[];
  /** The stored items: edits start from these. */
  original: MoodItem[];
  accent: string;
  readOnly: boolean;
  view: View;
  setView: (fn: (v: View) => View) => void;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onChange: (next: MoodItem[]) => void;
  /** Called when the person moves the canvas themselves (stops following). */
  onUserMove: () => void;
  /** Mind map cards, so one dragged in from the sidebar becomes a moodboard card. */
  mapNodes: BoardNode[];
}

/** Drag type used by the sidebar palette. */
export const NODE_DRAG = "application/x-xlide-node";

/** A mind map card as a moodboard item (keeps a reference to it). */
export function moodFromNode(n: BoardNode): Partial<MoodItem> & { type: MoodType } {
  const ref = n.id;
  if (n.kind === "video" && n.video) return { type: "video", video: n.video, poster: n.poster, caption: n.title, ref };
  if (n.kind === "media" && n.images?.[0]) return { type: "image", src: n.images[0], caption: n.title, ref };
  if (n.kind === "list") return { type: "todo", title: n.title, items: n.items ?? [], ref };
  if (n.kind === "asset" && n.url) return { type: "link", url: n.url, title: n.title, text: n.text, ref };
  if (n.kind === "metric") return { type: "note", title: n.title, text: [n.value, n.text].filter(Boolean).join("\n"), ref, w: 220 };
  const head = n.kind === "stage" && n.step ? `${String(n.step).padStart(2, "0")} · ${n.title}` : n.title;
  return { type: "note", title: head, text: n.text ?? "", ref, ...(n.kind === "idea" || n.kind === "stage" ? { color: "#e0512b" } : {}) };
}

export function Moodboard({ items, original, accent, readOnly: viewerOnly, view, setView, stageRef, onChange, onUserMove, mapNodes }: Props) {
  // The owner can switch to a clean view (no tools, no selection) to present.
  const [preview, setPreview] = useState(false);
  const readOnly = viewerOnly || preview;
  const { t } = usePrefs();
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(INK);
  const [width, setWidth] = useState(4);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Box>>({});
  const [stroke, setStroke] = useState<[number, number][] | null>(null);
  const [shapeDraft, setShapeDraft] = useState<{ a: [number, number]; b: [number, number] } | null>(null);
  const [marquee, setMarquee] = useState<{ a: [number, number]; b: [number, number] } | null>(null);
  const [space, setSpace] = useState(false);
  const [player, setPlayer] = useState<number | null>(null);
  const [dropping, setDropping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const past = useRef<MoodItem[][]>([]);
  const future = useRef<MoodItem[][]>([]);
  const fitted = useRef(false);

  const origById = useMemo(() => new Map(original.map((i) => [i.id, i])), [original]);
  useBrandFonts(items);

  /* ───── history ───── */
  const commit = useCallback(
    (fn: (list: MoodItem[]) => MoodItem[]) => {
      past.current = [...past.current.slice(-60), original];
      future.current = [];
      onChange(fn(structuredClone(original)));
    },
    [original, onChange],
  );
  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(original);
    onChange(prev);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(original);
    onChange(next);
  };
  const patch = (id: string, p: Partial<MoodItem>) => commit((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));

  /* ───── coordinates ───── */
  const toWorld = (cx: number, cy: number): [number, number] => {
    const r = stageRef.current!.getBoundingClientRect();
    return [(cx - r.left - view.x) / view.z, (cy - r.top - view.y) / view.z];
  };
  const center = (): [number, number] => {
    const el = stageRef.current;
    if (!el) return [0, 0];
    return [(el.clientWidth / 2 - view.x) / view.z, (el.clientHeight / 2 - view.y) / view.z];
  };
  const box = (i: MoodItem): Box => draft[i.id] ?? { x: i.x, y: i.y, w: i.w, h: i.h };

  const fit = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (!items.length) {
      setView(() => ({ x: el.clientWidth / 2 - 300, y: el.clientHeight / 2 - 200, z: 1 }));
      return;
    }
    const minX = Math.min(...items.map((i) => i.x)) - 60, minY = Math.min(...items.map((i) => i.y)) - 60;
    const maxX = Math.max(...items.map((i) => i.x + i.w)) + 60, maxY = Math.max(...items.map((i) => i.y + i.h)) + 120;
    // Leave room for the bars on top (72px) and the tools at the bottom (84px).
    const top = 72, bottom = 84, availH = Math.max(100, el.clientHeight - top - bottom);
    const z = clampZ(Math.min(1.2, el.clientWidth / (maxX - minX), availH / (maxY - minY)));
    setView(() => ({ z, x: (el.clientWidth - (maxX - minX) * z) / 2 - minX * z, y: top + (availH - (maxY - minY) * z) / 2 - minY * z }));
  }, [items, setView, stageRef]);

  useEffect(() => {
    if (fitted.current || !stageRef.current) return;
    fitted.current = true;
    if (view.x === 0 && view.y === 0 && view.z === 1) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomAt = useCallback(
    (k: number, px?: number, py?: number) => {
      const el = stageRef.current;
      if (!el) return;
      const cx = px ?? el.clientWidth / 2, cy = py ?? el.clientHeight / 2;
      setView((v) => {
        const z = clampZ(v.z * k);
        return { z, x: cx - ((cx - v.x) / v.z) * z, y: cy - ((cy - v.y) / v.z) * z };
      });
    },
    [setView, stageRef],
  );

  /* Trackpad: two-finger scroll pans, pinch (ctrl + wheel) zooms; Safari sends gesture events. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      onUserMove();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-Math.max(-25, Math.min(25, e.deltaY)) * 0.012), e.clientX - r.left, e.clientY - r.top);
      else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    let gScale = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gScale = 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { scale: number; clientX: number; clientY: number };
      const r = el.getBoundingClientRect();
      zoomAt(ge.scale / gScale, ge.clientX - r.left, ge.clientY - r.top);
      gScale = ge.scale;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, [onUserMove, setView, stageRef, zoomAt]);

  /* ───── adding things ───── */
  const place = (it: Partial<MoodItem> & { type: MoodType }, at?: [number, number]) => {
    const [cx, cy] = at ?? center();
    const w = it.w ?? { image: 280, note: 260, todo: 280, color: 170, link: 280, video: 200, text: 260, draw: 200, shape: 160, type: 560, divider: 800 }[it.type];
    const h = it.h ?? { image: 210, note: 150, todo: 160, color: 190, link: 120, video: 356, text: 60, draw: 200, shape: 120, type: 340, divider: 40 }[it.type];
    const item = { id: newId("m_"), x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h, ...it } as MoodItem;
    commit((list) => [...list, item]);
    setSelected([item.id]);
    return item;
  };

  const addImage = async (src: string, at?: [number, number], caption?: string) => {
    const { w, h } = await imageSize(src);
    const W = Math.min(320, w);
    place({ type: "image", src, caption, w: W, h: Math.round((W * h) / w) }, at);
  };

  const addFiles = async (files: File[], at?: [number, number]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) {
      if (files.length) toast(t("mood.onlyImages"));
      return;
    }
    const [x0, y0] = at ?? center();
    // Upload every file first, then add them in ONE commit: committing per image
    // reused the board as it was when the files were dropped, so each new image
    // replaced the one before it.
    const loaded = await Promise.allSettled(
      imgs.map(async (f) => {
        const { url } = await uploadImage(f);
        const { w, h } = await imageSize(url);
        return { url, w, h, caption: f.name.replace(/\.[a-z0-9]+$/i, "") };
      }),
    );
    const ok = loaded.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (!ok.length) return;

    // Side by side in a grid (rows of up to 4), centred on the drop point.
    const GAP = 24, MAX_W = 320, cols = Math.min(ok.length, 4);
    const sized = ok.map((o) => {
      const W = Math.min(MAX_W, o.w);
      return { ...o, W, H: Math.round((W * o.h) / o.w) };
    });
    const rows: (typeof sized)[] = [];
    for (let i = 0; i < sized.length; i += cols) rows.push(sized.slice(i, i + cols));
    const rowW = (r: typeof sized) => r.reduce((s, o) => s + o.W, 0) + GAP * (r.length - 1);
    const rowH = (r: typeof sized) => Math.max(...r.map((o) => o.H));
    const totalW = Math.max(...rows.map(rowW));
    const totalH = rows.reduce((s, r) => s + rowH(r), 0) + GAP * (rows.length - 1);
    const added: MoodItem[] = [];
    let y = y0 - totalH / 2;
    for (const r of rows) {
      let x = x0 - totalW / 2;
      for (const o of r) {
        added.push({ id: newId("m_"), type: "image", src: o.url, caption: o.caption, x: Math.round(x), y: Math.round(y), w: o.W, h: o.H } as MoodItem);
        x += o.W + GAP;
      }
      y += rowH(r) + GAP;
    }
    commit((list) => [...list, ...added]);
    setSelected(added.map((i) => i.id));
    if (ok.length < imgs.length) toast(t("mood.someFailed"));
  };

  /** Text from a drop or a paste: image link, video link, web link or a note. */
  const addText = async (raw: string, at?: [number, number]) => {
    const s = raw.trim();
    if (!s) return;
    if (isImageUrl(s)) return addImage(s, at);
    if (isUrl(s) && parseVideo(s)) return place({ type: "video", video: s, caption: domainOf(s) }, at);
    if (isUrl(s)) return place({ type: "link", url: s, title: domainOf(s) }, at);
    place({ type: "note", text: s }, at);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropping(false);
    if (readOnly) return;
    const at = toWorld(e.clientX, e.clientY);
    const nodeId = e.dataTransfer.getData(NODE_DRAG);
    if (nodeId) {
      const n = mapNodes.find((x) => x.id === nodeId);
      if (n) {
        const it = moodFromNode(n);
        if (it.type === "image" && it.src) return addImage(it.src, at, it.caption);
        place(it, at);
      }
      return;
    }
    const files = [...e.dataTransfer.files];
    if (files.length) return addFiles(files, at);
    // Images dragged from another web page come as HTML with an <img>.
    const html = e.dataTransfer.getData("text/html");
    const img = html && /<img[^>]+src="([^"]+)"/i.exec(html)?.[1];
    if (img && /^https?:/.test(img)) return addImage(img, at);
    addText(e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain"), at);
  };

  // The sidebar's "+" (no drag on touch screens) sends cards here.
  useEffect(() => {
    if (readOnly) return;
    const onAdd = (e: Event) => {
      const n = mapNodes.find((x) => x.id === (e as CustomEvent<string>).detail);
      if (!n) return;
      const it = moodFromNode(n);
      if (it.type === "image" && it.src) addImage(it.src, undefined, it.caption);
      else place(it);
    };
    const onAddItem = (e: Event) => place((e as CustomEvent<Partial<MoodItem> & { type: MoodType }>).detail);
    window.addEventListener("xlide:mood-add-node", onAdd);
    window.addEventListener("xlide:mood-add", onAddItem);
    return () => {
      window.removeEventListener("xlide:mood-add-node", onAdd);
      window.removeEventListener("xlide:mood-add", onAddItem);
    };
  });

  // Paste: images from the clipboard, links and text.
  useEffect(() => {
    if (readOnly) return;
    const onPaste = (e: ClipboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || editing) return;
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) {
        e.preventDefault();
        addFiles(files);
        return;
      }
      const text = e.clipboardData?.getData("text/plain");
      if (text) {
        e.preventDefault();
        addText(text);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  /* ───── pointer ───── */
  type Gesture =
    | { kind: "pan"; sx: number; sy: number; vx: number; vy: number }
    | { kind: "move"; sx: number; sy: number; start: Record<string, Box>; moved: boolean; id: string }
    | { kind: "resize"; id: string; sx: number; sy: number; start: Box; lock: boolean }
    | { kind: "draw" }
    | { kind: "shape" }
    | { kind: "marquee" };
  const g = useRef<Gesture | null>(null);
  const lastTap = useRef({ id: "", t: 0 });
  const openItem = (id: string) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    if (it.type === "video" && it.video) return setPlayer(videos.findIndex((v) => v.id === id));
    if (!readOnly && it.type !== "draw" && it.type !== "shape") setEditing(id);
  };
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  const startPan = (e: RPointerEvent) => {
    g.current = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
  };

  const onStageDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.pointerType === "touch") {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        pinch.current = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        g.current = null;
        setStroke(null);
        return;
      }
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setEditing(null);
    const p = toWorld(e.clientX, e.clientY);
    if (readOnly || tool === "hand" || space || e.button === 1) return startPan(e);
    if (tool === "pencil") {
      g.current = { kind: "draw" };
      setStroke([p]);
      return;
    }
    if (tool === "text") {
      const it = place({ type: "text", text: "", color, size: "md" }, [p[0] + 120, p[1] + 20]);
      setEditing(it.id);
      setTool("select");
      return;
    }
    if (tool !== "select") {
      g.current = { kind: "shape" };
      setShapeDraft({ a: p, b: p });
      return;
    }
    // Select tool on the empty board: finger pans, mouse draws a selection box.
    if (e.pointerType === "touch") return startPan(e);
    if (!e.shiftKey) setSelected([]);
    g.current = { kind: "marquee" };
    setMarquee({ a: p, b: p });
  };

  const onItemDown = (e: RPointerEvent, it: MoodItem) => {
    if (readOnly || tool !== "select" || space || e.button !== 0) return; // the stage handles it
    e.stopPropagation();
    if (editing === it.id) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const ids = selected.includes(it.id) ? selected : e.shiftKey ? [...selected, it.id] : [it.id];
    if (!selected.includes(it.id)) setSelected(ids);
    const start: Record<string, Box> = {};
    for (const id of ids) {
      const x = origById.get(id);
      if (x) start[id] = { x: x.x, y: x.y, w: x.w, h: x.h };
    }
    g.current = { kind: "move", sx: e.clientX, sy: e.clientY, start, moved: false, id: it.id };
  };

  const onHandleDown = (e: RPointerEvent, it: MoodItem) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const o = origById.get(it.id) ?? it;
    g.current = { kind: "resize", id: it.id, sx: e.clientX, sy: e.clientY, start: { x: o.x, y: o.y, w: o.w, h: o.h }, lock: ["image", "video", "color"].includes(it.type) };
  };

  const onMove = (e: RPointerEvent) => {
    if (e.pointerType === "touch" && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current && touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        const r = stageRef.current!.getBoundingClientRect();
        onUserMove();
        zoomAt(d / pinch.current, (a!.x + b!.x) / 2 - r.left, (a!.y + b!.y) / 2 - r.top);
        pinch.current = d;
        return;
      }
    }
    const cur = g.current;
    if (!cur) return;
    if (cur.kind === "pan") {
      onUserMove();
      setView((v) => ({ ...v, x: cur.vx + e.clientX - cur.sx, y: cur.vy + e.clientY - cur.sy }));
    } else if (cur.kind === "draw") {
      const p = toWorld(e.clientX, e.clientY);
      setStroke((s) => {
        if (!s) return s;
        const last = s[s.length - 1]!;
        return Math.hypot(p[0] - last[0], p[1] - last[1]) * view.z < 2 ? s : [...s, p];
      });
    } else if (cur.kind === "shape") {
      const p = toWorld(e.clientX, e.clientY);
      setShapeDraft((d) => (d ? { ...d, b: p } : d));
    } else if (cur.kind === "marquee") {
      const p = toWorld(e.clientX, e.clientY);
      setMarquee((m) => (m ? { ...m, b: p } : m));
    } else if (cur.kind === "move") {
      const dx = (e.clientX - cur.sx) / view.z, dy = (e.clientY - cur.sy) / view.z;
      if (!cur.moved && Math.hypot(dx, dy) * view.z < 3) return;
      cur.moved = true;
      const next: Record<string, Box> = {};
      for (const [id, b] of Object.entries(cur.start)) next[id] = { ...b, x: Math.round(b.x + dx), y: Math.round(b.y + dy) };
      setDraft(next);
    } else if (cur.kind === "resize") {
      let w = Math.max(24, cur.start.w + (e.clientX - cur.sx) / view.z);
      let h = Math.max(16, cur.start.h + (e.clientY - cur.sy) / view.z);
      if (cur.lock !== e.shiftKey) {
        const k = Math.max(w / cur.start.w, h / cur.start.h);
        w = cur.start.w * k;
        h = cur.start.h * k;
      }
      setDraft({ [cur.id]: { ...cur.start, w: Math.round(w), h: Math.round(h) } });
    }
  };

  const onUp = (e: RPointerEvent) => {
    touches.current.delete(e.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    const cur = g.current;
    g.current = null;
    if (!cur) return;
    if (cur.kind === "draw" && stroke) {
      setStroke(null);
      if (stroke.length < 2) return;
      const pad = width;
      const xs = stroke.map((p) => p[0]), ys = stroke.map((p) => p[1]);
      const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
      const w = Math.max(8, Math.max(...xs) + pad - x), h = Math.max(8, Math.max(...ys) + pad - y);
      const item: MoodItem = { id: newId("m_"), type: "draw", x, y, w, h, vw: w, vh: h, color, stroke: width, points: stroke.flatMap(([px, py]) => [px - x, py - y]) };
      commit((list) => [...list, item]);
    } else if (cur.kind === "shape" && shapeDraft) {
      setShapeDraft(null);
      const { a, b } = shapeDraft;
      const shape = tool as ShapeKind;
      let x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
      let w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]);
      if (w < 6 && h < 6) {
        // A click: default size.
        w = shape === "line" || shape === "arrow" ? 160 : 140;
        h = shape === "line" || shape === "arrow" ? 0 : 100;
        x = a[0];
        y = a[1];
        b[0] = a[0] + w;
        b[1] = a[1];
      }
      const linear = shape === "line" || shape === "arrow";
      // Nearly flat or upright lines snap straight.
      const axis = linear ? (h < 14 && w >= 14 ? "h" : w < 14 && h >= 14 ? "v" : undefined) : undefined;
      if (axis === "h") {
        y = (a[1] + b[1]) / 2 - 12;
        h = 24;
      }
      if (axis === "v") {
        x = (a[0] + b[0]) / 2 - 12;
        w = 24;
      }
      const item: MoodItem = {
        id: newId("m_"), type: "shape", shape, x: Math.round(x), y: Math.round(y), w: Math.max(16, Math.round(w)), h: Math.max(16, Math.round(h)),
        color, stroke: width,
        ...(linear ? { flipX: b[0] < a[0], flipY: b[1] < a[1], ...(axis ? { axis } : {}) } : {}),
      };
      commit((list) => [...list, item]);
      setSelected([item.id]);
      setTool("select");
    } else if (cur.kind === "marquee" && marquee) {
      setMarquee(null);
      const x1 = Math.min(marquee.a[0], marquee.b[0]), x2 = Math.max(marquee.a[0], marquee.b[0]);
      const y1 = Math.min(marquee.a[1], marquee.b[1]), y2 = Math.max(marquee.a[1], marquee.b[1]);
      if (x2 - x1 < 4 && y2 - y1 < 4) return;
      const hit = items.filter((i) => i.x < x2 && i.x + i.w > x1 && i.y < y2 && i.y + i.h > y1).map((i) => i.id);
      setSelected((s) => [...new Set([...s, ...hit])]);
    } else if (cur.kind === "move" && !cur.moved) {
      // Double tap on a card: edit it (or play a video).
      const now = Date.now();
      if (lastTap.current.id === cur.id && now - lastTap.current.t < 420) {
        lastTap.current = { id: "", t: 0 };
        openItem(cur.id);
      } else lastTap.current = { id: cur.id, t: now };
    } else if ((cur.kind === "move" && cur.moved) || cur.kind === "resize") {
      const d = draft;
      setDraft({});
      commit((list) => list.map((i) => (d[i.id] ? { ...i, ...d[i.id] } : i)));
    }
  };

  /* ───── selection actions ───── */
  const sel = selected.map((id) => origById.get(id)).filter((x): x is MoodItem => !!x);
  const remove = () => {
    if (!selected.length) return;
    const ids = new Set(selected);
    commit((list) => list.filter((i) => !ids.has(i.id)));
    setSelected([]);
  };
  const duplicate = () => {
    if (!sel.length) return;
    const copies = sel.map((i) => ({ ...structuredClone(i), id: newId("m_"), x: i.x + 28, y: i.y + 28 }));
    commit((list) => [...list, ...copies]);
    setSelected(copies.map((c) => c.id));
  };
  const reorder = (front: boolean) => {
    const ids = new Set(selected);
    commit((list) => {
      const pick = list.filter((i) => ids.has(i.id)), rest = list.filter((i) => !ids.has(i.id));
      return front ? [...rest, ...pick] : [...pick, ...rest];
    });
  };
  const recolor = (c: string) => {
    setColor(c);
    if (!sel.length) return;
    const ids = new Set(selected);
    commit((list) => list.map((i) => (ids.has(i.id) && ["draw", "shape", "text", "color", "note"].includes(i.type) ? { ...i, color: c } : i)));
  };
  const restroke = (w: number) => {
    setWidth(w);
    const ids = new Set(selected);
    if (sel.some((i) => i.type === "draw" || i.type === "shape")) commit((list) => list.map((i) => (ids.has(i.id) && (i.type === "draw" || i.type === "shape") ? { ...i, stroke: w } : i)));
  };

  /* ───── keyboard ───── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || editing || player !== null) return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === " ") {
        setSpace(true);
        e.preventDefault();
        return;
      }
      if (e.key === "+" || e.key === "=") return zoomAt(1.2);
      if (e.key === "-") return zoomAt(1 / 1.2);
      if (e.key === "0" && !mod) return fit();
      if (readOnly) return;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return e.shiftKey ? redo() : undo();
      }
      if (mod && e.key.toLowerCase() === "y") return redo();
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        return duplicate();
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        return setSelected(items.map((i) => i.id));
      }
      if (mod) return;
      if (e.key === "Delete" || e.key === "Backspace") return remove();
      if (e.key === "Escape") {
        setSelected([]);
        setTool("select");
      }
      if (e.key === "Enter" && selected.length === 1) {
        e.preventDefault();
        setEditing(selected[0]!);
      }
      const keys: Record<string, Tool> = { v: "select", h: "hand", p: "pencil", t: "text", r: "rect", o: "ellipse", l: "line", a: "arrow" };
      if (keys[e.key]) setTool(keys[e.key]!);
    };
    const onKeyUp = (e: KeyboardEvent) => e.key === " " && setSpace(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  /* ───── videos in the moodboard, in board order ───── */
  const videos: BoardNode[] = items.filter((i) => i.type === "video" && i.video).map((i) => ({ id: i.id, kind: "video", title: i.caption ?? i.title ?? "", video: i.video, poster: i.poster }));

  useEffect(() => {
    if (preview) {
      setSelected([]);
      setTool("select");
    }
  }, [preview]);
  const drawing = !readOnly && tool !== "select" && tool !== "hand";
  const cursor = readOnly || tool === "hand" || space ? "cursor-grab active:cursor-grabbing" : drawing ? "cursor-crosshair" : "cursor-default";

  return (
    <div className="absolute inset-0" style={{ background: PAPER, color: INK }}>
      <div
        ref={stageRef}
        className={cn("absolute inset-0 touch-none select-none", cursor)}
        onPointerDown={onStageDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDragOver={(e) => {
          if (readOnly) return;
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={onDrop}
      >
        {/* Paper grain: a very light vignette, no grid. */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgb(0 0 0 / 0.045))" }} />
        <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          {items.map((it) => {
            const b = box(it);
            const isSel = selected.includes(it.id);
            return (
              <div
                key={it.id}
                data-mood={it.id}
                className={cn("absolute", GROWS.has(it.type) && "flex flex-col", !readOnly && tool === "select" && !space && "cursor-move", drawing && "pointer-events-none")}
                style={{ left: b.x, top: b.y, width: b.w, ...(GROWS.has(it.type) ? { minHeight: b.h } : { height: b.h }) }}
                onPointerDown={(e) => onItemDown(e, it)}
                onDoubleClick={() => readOnly && it.type === "video" && setPlayer(videos.findIndex((v) => v.id === it.id))}
              >
                <ItemView
                  item={it}
                  source={origById.get(it.id) ?? it}
                  box={b}
                  accent={accent}
                  editing={editing === it.id}
                  readOnly={readOnly}
                  onEdit={(p) => patch(it.id, p)}
                  onDoneEditing={() => setEditing(null)}
                  onPlay={() => setPlayer(videos.findIndex((v) => v.id === it.id))}
                />
                {isSel && !readOnly && (
                  <>
                    <div className="pointer-events-none absolute -inset-1" style={{ outline: `${1.5 / view.z}px solid ${accent}` }} />
                    {selected.length === 1 && (
                      <div
                        className="absolute cursor-nwse-resize border bg-white"
                        style={{ right: -6 / view.z, bottom: -6 / view.z, width: 12 / view.z, height: 12 / view.z, borderColor: accent, borderWidth: 1.5 / view.z }}
                        onPointerDown={(e) => onHandleDown(e, it)}
                        title={t("mood.resize")}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Live previews */}
          {stroke && (
            <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1">
              <path d={smoothPath(stroke)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {shapeDraft && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: Math.min(shapeDraft.a[0], shapeDraft.b[0]), top: Math.min(shapeDraft.a[1], shapeDraft.b[1]),
                width: Math.abs(shapeDraft.b[0] - shapeDraft.a[0]), height: Math.abs(shapeDraft.b[1] - shapeDraft.a[1]),
              }}
            >
              <ShapeSvg
                shape={tool as ShapeKind}
                w={Math.abs(shapeDraft.b[0] - shapeDraft.a[0])}
                h={Math.abs(shapeDraft.b[1] - shapeDraft.a[1])}
                color={color}
                stroke={width}
                flipX={shapeDraft.b[0] < shapeDraft.a[0]}
                flipY={shapeDraft.b[1] < shapeDraft.a[1]}
              />
            </div>
          )}
          {marquee && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: Math.min(marquee.a[0], marquee.b[0]), top: Math.min(marquee.a[1], marquee.b[1]),
                width: Math.abs(marquee.b[0] - marquee.a[0]), height: Math.abs(marquee.b[1] - marquee.a[1]),
                border: `${1 / view.z}px dashed ${accent}`, background: "rgb(224 81 43 / 0.06)",
              }}
            />
          )}
        </div>

        {!items.length && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-sm">
              <ImagePlus className="mx-auto size-8 opacity-30" />
              <p className="mt-3 text-lg font-medium">{t("mood.emptyTitle")}</p>
              <p className="mt-1 text-sm opacity-60">{readOnly ? t("mood.emptyRead") : t("mood.emptyHint")}</p>
            </div>
          </div>
        )}
        {dropping && <div className="pointer-events-none absolute inset-3 border-2 border-dashed" style={{ borderColor: accent, background: "rgb(224 81 43 / 0.05)" }} />}
      </div>

      {/* Selection bar */}
      {!readOnly && sel.length > 0 && !editing && (
        <div className="absolute top-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 border border-black/10 bg-white p-1 text-[#161615] shadow-[0_12px_30px_-14px_rgb(0_0_0/0.35)] sm:top-20">
          <Swatches value={sel[0]?.color ?? color} onPick={recolor} />
          {sel.some((i) => i.type === "draw" || i.type === "shape") && <Widths value={sel[0]?.stroke ?? width} onPick={restroke} />}
          {sel.some((i) => i.type === "shape" && !["line", "arrow"].includes(i.shape ?? "")) && (
            <button
              type="button"
              onClick={() => {
                const ids = new Set(selected);
                const filled = sel.some((i) => i.fill);
                commit((list) => list.map((i) => (ids.has(i.id) && i.type === "shape" ? { ...i, fill: filled ? undefined : `${i.color ?? INK}33` } : i)));
              }}
              className={cn("label-xs h-8 px-2", sel.some((i) => i.fill) ? "bg-[#161615] text-white" : "hover:bg-black/5")}
            >
              {t("mood.fill")}
            </button>
          )}
          {sel.length === 1 && sel[0]!.type === "text" && (
            <div className="flex">
              {(["sm", "md", "lg", "xl"] as const).map((s) => (
                <button key={s} type="button" onClick={() => patch(sel[0]!.id, { size: s })} className={cn("label-xs h-8 px-2", (sel[0]!.size ?? "md") === s ? "bg-[#161615] text-white" : "hover:bg-black/5")}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <span className="mx-1 h-5 border-l border-black/10" />
          <BarButton label={t("mood.duplicate")} onClick={duplicate}><Copy className="size-4" /></BarButton>
          <BarButton label={t("mood.front")} onClick={() => reorder(true)}><BringToFront className="size-4" /></BarButton>
          <BarButton label={t("mood.back")} onClick={() => reorder(false)}><SendToBack className="size-4" /></BarButton>
          <BarButton label={t("mood.delete")} onClick={remove}><Trash2 className="size-4" /></BarButton>
        </div>
      )}

      {/* Tools */}
      <div className="absolute bottom-4 left-1/2 z-20 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto border border-black/10 bg-white p-1 text-[#161615] shadow-[0_18px_40px_-20px_rgb(0_0_0/0.4)] no-scrollbar">
        <ToolButton active={tool === "select" && !space} label={t("mood.tool.select")} onClick={() => setTool("select")} hidden={readOnly}><MousePointer2 className="size-4" /></ToolButton>
        <ToolButton active={tool === "hand" || space || readOnly} label={t("mood.tool.hand")} onClick={() => setTool("hand")}><Hand className="size-4" /></ToolButton>
        {!readOnly && (
          <>
            <ToolButton active={tool === "pencil"} label={t("mood.tool.pencil")} onClick={() => setTool("pencil")}><Pencil className="size-4" /></ToolButton>
            <ToolButton active={tool === "text"} label={t("mood.tool.text")} onClick={() => setTool("text")}><Type className="size-4" /></ToolButton>
            {([
              ["rect", Square], ["ellipse", Circle], ["triangle", Triangle], ["line", Slash], ["arrow", MoveRight],
            ] as const).map(([k, Icon]) => (
              <ToolButton key={k} active={tool === k} label={t(`mood.shape.${k}`)} onClick={() => setTool(k)}><Icon className="size-4" /></ToolButton>
            ))}
            {drawing && (
              <>
                <span className="mx-1 h-5 border-l border-black/10" />
                <Swatches value={color} onPick={setColor} />
                <Widths value={width} onPick={setWidth} />
              </>
            )}
            <span className="mx-1 h-5 border-l border-black/10" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label={t("mood.add")} title={t("mood.add")} className="grid size-10 shrink-0 place-items-center text-white" style={{ background: INK }}>
                  <Plus className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="center">
                <DropdownMenuItem onSelect={() => fileInput.current?.click()}><ImagePlus /> {t("mood.add.image")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditing(place({ type: "note", text: "" }).id)}><StickyNote /> {t("mood.add.note")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditing(place({ type: "todo", title: t("mood.todoTitle"), items: [] }).id)}><ListTodo /> {t("mood.add.todo")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditing(place({ type: "color", color: accent, name: "" }).id)}><Palette /> {t("mood.add.color")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditing(place({ type: "link", url: "", title: "" }).id)}><Link2 /> {t("mood.add.link")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditing(place({ type: "video", video: "", caption: "" }).id)}><Video /> {t("mood.add.video")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditing(place({ type: "text", text: "", size: "lg", color: INK }).id)}><Type /> {t("mood.add.text")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <BarButton label={t("mood.undo")} onClick={undo} disabled={!past.current.length}><Undo2 className="size-4" /></BarButton>
            <BarButton label={t("mood.redo")} onClick={redo} disabled={!future.current.length}><Redo2 className="size-4" /></BarButton>
          </>
        )}
      </div>

      {/* Zoom (and, for the owner, view / edit) */}
      <div className="absolute bottom-4 left-4 z-20 hidden items-center border border-black/10 bg-white text-[#161615] shadow-[0_12px_30px_-16px_rgb(0_0_0/0.35)] md:flex">
        {!viewerOnly && (
          <>
            <button type="button" onClick={() => setPreview((p) => !p)} className={cn("label-xs flex h-10 items-center gap-1.5 px-3", preview ? "bg-[#161615] text-white" : "hover:bg-black/5")} title={preview ? t("mood.edit") : t("mood.preview")}>
              {preview ? <Pencil className="size-3.5" /> : <Eye className="size-3.5" />} {preview ? t("mood.edit") : t("mood.preview")}
            </button>
            <span className="h-5 border-l border-black/10" />
          </>
        )}
        <BarButton label={t("mood.zoomOut")} onClick={() => zoomAt(1 / 1.25)}><Minus className="size-4" /></BarButton>
        <button type="button" onClick={() => setView((v) => ({ ...v, z: 1 }))} className="label-xs h-10 w-14 hover:bg-black/5" title={t("mood.zoomReset")}>
          {Math.round(view.z * 100)}%
        </button>
        <BarButton label={t("mood.zoomIn")} onClick={() => zoomAt(1.25)}><Plus className="size-4" /></BarButton>
        <BarButton label={t("board.tool.fit")} onClick={fit}><Maximize className="size-4" /></BarButton>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          addFiles(files);
        }}
      />

      {player !== null && player >= 0 && videos.length > 0 && <ReelPlayer videos={videos} start={player} stageOf={() => undefined} onClose={() => setPlayer(null)} />}
    </div>
  );
}

/* ───────── items ───────── */

function ItemView({ item: it, source, box: b, accent, editing, readOnly, onEdit, onDoneEditing, onPlay }: {
  item: MoodItem;
  source: MoodItem;
  box: Box;
  accent: string;
  editing: boolean;
  readOnly: boolean;
  onEdit: (p: Partial<MoodItem>) => void;
  onDoneEditing: () => void;
  onPlay: () => void;
}) {
  const { t } = usePrefs();
  const grows = GROWS.has(it.type);
  const card = (grows ? "flex-1 w-full break-words " : "size-full overflow-hidden ") + "bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06),0_14px_32px_-18px_rgb(0_0_0/0.35)] transition-shadow hover:shadow-[0_1px_2px_rgb(0_0_0/0.08),0_22px_44px_-18px_rgb(0_0_0/0.4)]";
  const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };
  const area = (value: string, set: (v: string) => void, placeholder: string, style?: CSSProperties, className?: string) => (
    <textarea
      {...stop}
      autoFocus
      defaultValue={value}
      placeholder={placeholder}
      onBlur={(e) => {
        set(e.target.value);
        onDoneEditing();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
          e.stopPropagation();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className={cn("min-h-full w-full resize-none bg-transparent outline-none placeholder:opacity-40", className)}
      style={{ fieldSizing: "content", ...style } as CSSProperties}
    />
  );

  switch (it.type) {
    case "image":
      return (
        <div className={cn(card, "flex flex-col")}>
          <div className="min-h-0 flex-1 bg-[#e9e8e3]">{it.src && <img src={it.src} alt={it.caption ?? ""} draggable={false} className="size-full object-cover" />}</div>
          {editing ? (
            <input
              {...stop}
              autoFocus
              defaultValue={source.caption ?? ""}
              placeholder={t("mood.caption")}
              onBlur={(e) => {
                onEdit({ caption: e.target.value || undefined });
                onDoneEditing();
              }}
              onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && (e.target as HTMLInputElement).blur()}
              className="h-9 shrink-0 px-3 text-xs outline-none"
            />
          ) : (
            it.caption && <p className="h-9 shrink-0 truncate px-3 text-xs leading-9 text-black/60">{it.caption}</p>
          )}
        </div>
      );
    case "note":
      return (
        <div className={cn(card, "p-4")} style={{ borderTop: it.color && it.color !== "#ffffff" && it.color !== INK ? `4px solid ${it.color}` : undefined }}>
          {it.title && !editing && <p className="mb-1.5 font-semibold break-words">{it.title}</p>}
          {editing ? (
            <div className="flex flex-col gap-1.5">
              {source.title !== undefined && (
                <input {...stop} defaultValue={source.title} onBlur={(e) => onEdit({ title: e.target.value })} className="font-semibold outline-none" />
              )}
              {area(source.text ?? "", (v) => onEdit({ text: v }), t("mood.notePlaceholder"), undefined, "text-[15px] leading-relaxed")}
            </div>
          ) : (
            (it.text || !it.title) && <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{it.text ? <Linkify text={it.text} /> : <span className="opacity-30">{t("mood.notePlaceholder")}</span>}</p>
          )}
        </div>
      );
    case "todo": {
      const done = it.items?.filter((i) => i.done).length ?? 0;
      return (
        <div className={cn(card, "p-4")}>
          {editing ? (
            <div className="flex size-full flex-col gap-2">
              <input {...stop} autoFocus defaultValue={source.title ?? ""} onBlur={(e) => onEdit({ title: e.target.value })} className="font-semibold outline-none" />
              {area((source.items ?? []).map((i) => (i.done ? `[x] ${i.text}` : i.text)).join("\n"), (v) =>
                onEdit({ items: v.split("\n").filter((l) => l.trim()).map((l) => (/^\[x\]\s*/i.test(l) ? { text: l.replace(/^\[x\]\s*/i, ""), done: true } : { text: l })) }),
                t("board.field.items"), undefined, "text-sm leading-7")}
            </div>
          ) : (
            <>
              <p className="flex items-baseline justify-between font-semibold">
                {it.title || t("mood.todoTitle")}
                <span className="label-xs font-normal text-black/40">{done}/{it.items?.length ?? 0}</span>
              </p>
              <ul className="mt-2 space-y-1">
                {(it.items ?? []).map((x, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      {...stop}
                      disabled={readOnly}
                      onClick={() => onEdit({ items: (source.items ?? []).map((y, j) => (j === i ? { ...y, done: !y.done } : y)) })}
                      className="flex w-full items-start gap-2.5 text-left text-sm"
                    >
                      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center border", x.done ? "border-transparent text-white" : "border-black/30")} style={x.done ? { background: accent } : undefined}>
                        {x.done && <Check className="size-3" />}
                      </span>
                      <span className={cn(x.done && "text-black/40 line-through")}><Linkify text={x.text} /></span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      );
    }
    case "color": {
      const c = it.color ?? accent;
      if (it.style === "dot") {
        const d = Math.min(b.w, b.h - 50);
        return (
          <div className="flex size-full flex-col items-center">
            {/* An SVG circle: the app's no-radius rule would square a rounded div. */}
            <div className="relative shrink-0" style={{ width: d, height: d }}>
              <svg width={d} height={d} className="block"><circle cx={d / 2} cy={d / 2} r={d / 2 - 0.5} fill={c} stroke={luminance(c) > 0.8 ? "rgb(0 0 0 / 0.15)" : "none"} /></svg>
              {editing && <input {...stop} type="color" defaultValue={/^#[0-9a-f]{6}$/i.test(c) ? c : "#e0512b"} onChange={(e) => onEdit({ color: e.target.value })} className="absolute right-0 bottom-0 size-8 cursor-pointer" />}
            </div>
            {editing ? (
              <input {...stop} autoFocus defaultValue={source.name ?? ""} placeholder={t("mood.colorName")} onBlur={(e) => { onEdit({ name: e.target.value || undefined }); onDoneEditing(); }} onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && (e.target as HTMLInputElement).blur()} className="mt-2 w-full bg-transparent text-center text-sm font-semibold outline-none" />
            ) : (
              <p className="mt-2 w-full truncate text-center text-sm font-semibold">{it.name}</p>
            )}
            <p className="font-mono text-[11px] text-black/50">{c.toUpperCase()}</p>
          </div>
        );
      }
      const rgb = /^#([0-9a-f]{6})$/i.test(c) ? [0, 2, 4].map((i) => parseInt(c.slice(1 + i, 3 + i), 16)).join(",") : c;
      const light = /^#([0-9a-f]{6})$/i.test(c) && [0, 2, 4].map((i) => parseInt(c.slice(1 + i, 3 + i), 16)).reduce((a, v) => a + v, 0) > 600;
      return (
        <div className={cn(card, "flex flex-col")}>
          <div className="relative min-h-0 flex-[7]" style={{ background: c }}>
            <span className={cn("absolute top-3 left-3 font-mono text-xs", light ? "text-black/60" : "text-white/85")}>{c.toUpperCase()} · {rgb}</span>
            {editing && (
              <input {...stop} type="color" defaultValue={/^#[0-9a-f]{6}$/i.test(c) ? c : "#e0512b"} onChange={(e) => onEdit({ color: e.target.value })} className="absolute right-2 bottom-2 size-9 cursor-pointer" />
            )}
          </div>
          <div className="flex min-h-0 flex-[3] items-center px-3">
            {editing ? (
              <input
                {...stop}
                autoFocus
                defaultValue={source.name ?? ""}
                placeholder={t("mood.colorName")}
                onBlur={(e) => {
                  onEdit({ name: e.target.value || undefined });
                  onDoneEditing();
                }}
                onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && (e.target as HTMLInputElement).blur()}
                className="w-full text-sm outline-none"
              />
            ) : (
              <p className="py-2 text-sm break-words text-black/70">{it.name || t("mood.colorName")}</p>
            )}
          </div>
        </div>
      );
    }
    case "link":
      return (
        <div className={cn(card, "flex flex-col justify-between p-4")}>
          {editing ? (
            <div className="flex flex-col gap-2">
              <input {...stop} autoFocus defaultValue={source.url ?? ""} placeholder="https://…" onBlur={(e) => onEdit({ url: e.target.value.trim(), title: source.title || domainOf(e.target.value.trim()) })} className="text-xs outline-none" />
              <input {...stop} defaultValue={source.title ?? ""} placeholder={t("board.field.title")} onBlur={(e) => { onEdit({ title: e.target.value }); onDoneEditing(); }} className="font-medium outline-none" />
            </div>
          ) : (
            <>
              <p className="flex items-center gap-2 text-xs text-black/45">
                {it.url && <img src={`https://www.google.com/s2/favicons?domain=${domainOf(it.url)}&sz=32`} alt="" className="size-4" />}
                <span className="truncate">{it.url ? domainOf(it.url) : "https://…"}</span>
              </p>
              <p className="mt-1 font-medium break-words" style={{ color: accent }}>{it.title || it.url}</p>
              {it.text && <p className="mt-1 text-xs break-words text-black/55">{it.text}</p>}
              {it.url && (
                <a {...stop} href={it.url} target="_blank" rel="noreferrer" className="absolute top-2 right-2 grid size-7 place-items-center text-black/40 hover:bg-black/5 hover:text-black" title={it.url}>
                  <ArrowUpRight className="size-4" />
                </a>
              )}
            </>
          )}
        </div>
      );
    case "video": {
      if (editing)
        return (
          <div className={cn(card, "relative bg-[#111] text-white")}>
            <div className="flex size-full flex-col justify-center gap-2 p-3">
              <input {...stop} autoFocus defaultValue={source.video ?? ""} placeholder="instagram.com/reel/…" onBlur={(e) => onEdit({ video: e.target.value.trim() })} className="bg-white/10 px-2 py-1.5 text-xs outline-none" />
              <input {...stop} defaultValue={source.caption ?? ""} placeholder={t("mood.caption")} onBlur={(e) => { onEdit({ caption: e.target.value }); onDoneEditing(); }} className="bg-white/10 px-2 py-1.5 text-xs outline-none" />
            </div>
          </div>
        );
      return <VideoTile url={it.video} poster={it.poster} title={it.caption} onExpand={onPlay} className={cn(card, "relative")} />;
    }
    case "text": {
      const style: CSSProperties = {
        fontSize: it.fontSize ? `${it.fontSize}px` : TEXT_SIZE[it.size ?? "md"],
        color: it.color ?? INK,
        lineHeight: 1.15,
        fontWeight: it.weight ?? (it.size === "xl" || it.size === "lg" ? 500 : 400),
        fontFamily: fontStack(it.font),
        textAlign: it.align,
        textTransform: it.upper ? "uppercase" : undefined,
        letterSpacing: it.tracking ? `${it.tracking}em` : undefined,
      };
      const fontRow = editing && (source.font || source.bg) && (
        <div {...stop} className="mb-2 flex w-full gap-1 bg-white/90 p-1 text-xs text-black">
          <input defaultValue={source.font ?? ""} placeholder={t("mood.fontFamily")} onBlur={(e) => onEdit({ font: e.target.value.trim() || undefined })} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="min-w-0 flex-1 px-1 outline-none" />
          <select defaultValue={source.weight ?? 400} onChange={(e) => onEdit({ weight: Number(e.target.value) })} className="outline-none">
            {Object.entries(WEIGHT_NAMES).map(([w, n]) => <option key={w} value={w}>{n}</option>)}
          </select>
          <input type="number" min={8} max={400} defaultValue={source.fontSize ?? ""} placeholder="px" onBlur={(e) => onEdit({ fontSize: e.target.value ? Number(e.target.value) : undefined })} className="w-14 px-1 outline-none" />
        </div>
      );
      const body = editing ? <div className="w-full">{fontRow}{area(source.text ?? "", (v) => onEdit({ text: v }), t("mood.textPlaceholder"), style)}</div> : (
        <p className="w-full break-words whitespace-pre-wrap" style={style}>{it.text || <span className="opacity-30">{t("mood.textPlaceholder")}</span>}</p>
      );
      if (!it.bg) return body;
      // A colour application: the text on its brand ground, centred like a post.
      return (
        <div className="flex w-full flex-1 items-center" style={{ background: it.bg, padding: Math.max(16, Math.round(b.w * 0.08)), boxShadow: luminance(it.bg) > 0.85 ? "inset 0 0 0 1px rgb(0 0 0 / 0.1)" : undefined }}>
          {body}
        </div>
      );
    }
    case "type": {
      const c = it.color ?? INK, fam = fontStack(it.font);
      const ws = parseWeights(it.weights);
      const big = Math.min(150, b.h * 0.42);
      return (
        <div className="flex size-full flex-col overflow-hidden" style={{ color: c, background: it.bg, padding: it.bg ? 20 : 0 }}>
          {editing && (
            <div {...stop} className="mb-2 flex gap-1 bg-white p-1 text-xs text-black shadow">
              <input autoFocus defaultValue={source.font ?? ""} placeholder={t("mood.fontFamily")} onBlur={(e) => onEdit({ font: e.target.value.trim() || undefined })} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="min-w-0 flex-1 px-1 outline-none" />
              <input defaultValue={source.weights ?? "400,700"} placeholder="300,400,700" onBlur={(e) => { onEdit({ weights: e.target.value }); onDoneEditing(); }} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="w-28 px-1 font-mono outline-none" />
            </div>
          )}
          <div className="flex gap-4">
            <p className="w-[42%] shrink-0 break-words" style={{ fontFamily: fam, fontSize: 40, lineHeight: 1.05, fontWeight: 500 }}>{it.font ?? "Inter"}</p>
            <ul className="space-y-0.5" style={{ fontFamily: fam, fontSize: 18 }}>
              {ws.slice(0, 5).map((w) => <li key={w} style={{ fontWeight: w }}>{WEIGHT_NAMES[w] ?? w}</li>)}
            </ul>
          </div>
          <div className="mt-auto flex items-end gap-4">
            <p className="w-[42%] shrink-0" style={{ fontFamily: fam, fontSize: big, lineHeight: 1 }}>Aa</p>
            <p className="text-sm leading-snug break-all" style={{ fontFamily: fam }}>abcdefghijklmn<br />opqrstuvwxyz<br />ABCDEFGHIJKLMN<br />OPQRSTUVWXYZ<br />0123456789!?&amp;</p>
          </div>
          {it.name && <p className="label-xs mt-2 text-black/50">{it.name}</p>}
        </div>
      );
    }
    case "divider":
      return (
        <div className="flex size-full flex-col items-center">
          <div className="h-px w-full" style={{ background: it.color && it.color !== INK ? it.color : "#bebdb7" }} />
          {editing ? (
            <input {...stop} autoFocus defaultValue={source.text ?? ""} onBlur={(e) => { onEdit({ text: e.target.value }); onDoneEditing(); }} onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && (e.target as HTMLInputElement).blur()} className="label-xs mt-2 bg-transparent text-center outline-none" />
          ) : (
            it.text && <p className="label-xs mt-2 tracking-[0.15em] text-black/55 uppercase">{it.text}</p>
          )}
        </div>
      );
    case "draw": {
      const sx = b.w / (it.vw || b.w), sy = b.h / (it.vh || b.h);
      const pts = pairs(it.points).map(([x, y]) => [x * sx, y * sy] as [number, number]);
      return (
        <svg width={b.w} height={b.h} className="overflow-visible">
          <path d={smoothPath(pts)} fill="none" stroke={it.color ?? INK} strokeWidth={it.stroke ?? 4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    case "shape":
      return <ShapeSvg shape={it.shape ?? "rect"} w={b.w} h={b.h} color={it.color ?? INK} fill={it.fill} stroke={it.stroke ?? 4} flipX={it.flipX} flipY={it.flipY} axis={it.axis} />;
  }
}

function ShapeSvg({ shape, w, h, color, fill, stroke, flipX, flipY, axis }: { shape: ShapeKind; w: number; h: number; color: string; fill?: string; stroke: number; flipX?: boolean; flipY?: boolean; axis?: "h" | "v" }) {
  const s = stroke / 2;
  const common = { fill: fill ?? "none", stroke: color, strokeWidth: stroke, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  let el: ReactNode;
  if (shape === "rect") el = <rect x={s} y={s} width={Math.max(0, w - stroke)} height={Math.max(0, h - stroke)} {...common} />;
  else if (shape === "ellipse") el = <ellipse cx={w / 2} cy={h / 2} rx={Math.max(0, w / 2 - s)} ry={Math.max(0, h / 2 - s)} {...common} />;
  else if (shape === "triangle") el = <polygon points={`${w / 2},${s} ${w - s},${h - s} ${s},${h - s}`} {...common} />;
  else {
    let x1 = flipX ? w : 0, x2 = flipX ? 0 : w, y1 = flipY ? h : 0, y2 = flipY ? 0 : h;
    if (axis === "h") y1 = y2 = h / 2;
    if (axis === "v") {
      x1 = x2 = w / 2;
      y1 = flipY ? h : 0;
      y2 = flipY ? 0 : h;
    }
    const ang = Math.atan2(y2 - y1, x2 - x1), head = Math.max(12, stroke * 3.5);
    el = (
      <>
        <line x1={x1} y1={y1} x2={x2} y2={y2} {...common} />
        {shape === "arrow" && (
          <polyline
            points={`${x2 - head * Math.cos(ang - 0.45)},${y2 - head * Math.sin(ang - 0.45)} ${x2},${y2} ${x2 - head * Math.cos(ang + 0.45)},${y2 - head * Math.sin(ang + 0.45)}`}
            {...common}
          />
        )}
      </>
    );
  }
  return (
    <svg width={Math.max(1, w)} height={Math.max(1, h)} className="overflow-visible">
      {el}
    </svg>
  );
}

/* ───────── small controls ───────── */

function ToolButton({ active, label, onClick, hidden, children }: { active: boolean; label: string; onClick: () => void; hidden?: boolean; children: ReactNode }) {
  if (hidden) return null;
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} onClick={onClick} className={cn("grid size-10 shrink-0 place-items-center", active ? "bg-[#161615] text-white" : "hover:bg-black/5")}>
      {children}
    </button>
  );
}

function BarButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className="grid size-10 shrink-0 place-items-center hover:bg-black/5 disabled:opacity-30">
      {children}
    </button>
  );
}

function Swatches({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1 px-1">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          aria-label={c}
          className={cn("size-5 shrink-0 border", value.toLowerCase() === c ? "ring-2 ring-offset-1 ring-black/70" : "border-black/15")}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function Widths({ value, onPick }: { value: number; onPick: (w: number) => void }) {
  return (
    <div className="flex items-center">
      {WIDTHS.map((w) => (
        <button key={w} type="button" onClick={() => onPick(w)} aria-label={`${w}px`} className={cn("grid size-8 shrink-0 place-items-center", value === w ? "bg-black/10" : "hover:bg-black/5")}>
          <span className="block bg-[#161615]" style={{ width: Math.min(16, w + 4), height: Math.min(16, w + 4), borderRadius: 999 }} />
        </button>
      ))}
    </div>
  );
}
