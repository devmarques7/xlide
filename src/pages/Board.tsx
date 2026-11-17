import {
  ArrowDownToLine, ArrowLeft, Pause, PlayCircle, ArrowRight, ArrowRightToLine, Cable, ChevronLeft, Columns3, Shapes, ChevronsDownUp, ChevronsUpDown, Eye, Focus, ListPlus, Minus, Hand, Languages, Loader2, Maximize, MousePointer2, Network, PanelRight, Plus, Radio, Share2, Sparkles, Spline, Workflow,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { KINDS, layoutBoard, NODE_W, newId, outline } from "../../shared/board.js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoGlyph } from "@/components/logo";
import { CONTENT_LANGS, isContentLang, storedLang, storeLang, useTranslatedBoard, type ContentLang } from "@/lib/board-i18n";
import { saveBoard, updateBoard, useBoard, type Board, type BoardNode, type NodeKind } from "@/lib/boards";
import { usePrefs } from "@/lib/prefs";
import { useSync, type SyncMessage } from "@/lib/sync";
import { LOCALES, type Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BoardShareDialog } from "./board/share";
import { KIND_ICON, NodeCard, videoPoster } from "./board/cards";
import { ReelPlayer } from "./board/reel-player";
import { Moodboard, type View as MoodViewState } from "./board/moodboard";
import { ProfilesDock } from "./board/profiles-dock";
import { Inspector, MapPalette, Overview } from "./board/side-panel";
import { setAutoplay, useAutoplay, VideoTile } from "./board/inline-video";

type Tool = "select" | "pan" | "connect";
interface View { x: number; y: number; z: number }
type Role = "owner" | "viewer";
type Live = Extract<SyncMessage, { t: "board" }>;

/** Owner page (passcode): edits the board and leads whoever follows it. */
export default function BoardPage() {
  return <BoardRoute role="owner" />;
}

/** Shared page (public link): follows the owner live, read-only, in the reader's own language. */
export function BoardViewPage() {
  return <BoardRoute role="viewer" />;
}

function BoardRoute({ role }: { role: Role }) {
  const { id } = useParams();
  const board = useBoard(id);
  const { t } = usePrefs();
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  if (!board && role === "viewer" && !waited) return <Loader2 className="mx-auto mt-[40vh] size-6 animate-spin text-muted-foreground" />;
  if (!board) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="text-muted-foreground">{t("board.notFound")}</p>
          {role === "owner" && (
            <Button asChild variant="outline" className="mt-4">
              <Link to="/boards">
                <ArrowLeft /> {t("nav.boards")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }
  return <BoardCanvas original={board} role={role} />;
}

function BoardCanvas({ original, role }: { original: Board; role: Role }) {
  const { t, locale, setLocale } = usePrefs();
  const owner = role === "owner";
  const [params] = useSearchParams();
  const [lang, setLangState] = useState<ContentLang>(() => {
    const q = params.get("lang");
    return isContentLang(q) ? q : storedLang(original.id) ?? "original";
  });
  const setLang = (l: ContentLang) => {
    setLangState(l);
    storeLang(original.id, l);
    // Readers also get the app's buttons in that language, when it has them.
    if (!owner && (LOCALES as readonly string[]).includes(l) && l !== locale) setLocale(l as Locale);
  };
  const { board, translating, failed } = useTranslatedBoard(original, lang);
  // A reader who opens a link with ?lang=en also gets the app's buttons in English (when the app has that language).
  useEffect(() => {
    if (!owner && (LOCALES as readonly string[]).includes(lang) && lang !== locale) setLocale(lang as Locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [shareOpen, setShareOpen] = useState(false);
  const [follow, setFollow] = useState(true);
  const [live, setLive] = useState<Live | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 1 });
  const [tool, setTool] = useState<Tool>("select");
  const [mode, setMode] = useState<"map" | "mood" | "kanban">("map");
  const [moodView, setMoodView] = useState<MoodViewState>({ x: 0, y: 0, z: 1 });
  const moodStage = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [resize, setResize] = useState<{ id: string; w: number; h: number } | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  /** A clicked highlight: the word and the cards it lights up. */
  const [wordHits, setWordHits] = useState<{ word: string; ids: Set<string> } | null>(null);
  const autoplay = useAutoplay();
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const [panel, setPanel] = useState(() => window.innerWidth >= 1024);
  const [player, setPlayer] = useState<number | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const fitted = useRef(false);
  const accent = board.accent;

  const nodes = board.nodes;
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  /* ───── flow lines: highlight one, collapse and open them one by one ───── */
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState(true);
  const kids = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of board.edges) m.set(e.from, [...(m.get(e.from) ?? []), e.to]);
    // Open in reading order: funnel step first, then top to bottom.
    for (const list of m.values()) list.sort((a, b) => (byId.get(a)?.step ?? 1e9) - (byId.get(b)?.step ?? 1e9) || (byId.get(a)?.y ?? 0) - (byId.get(b)?.y ?? 0));
    return m;
  }, [board.edges, byId]);
  const parentsOf = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of board.edges) m.set(e.to, [...(m.get(e.to) ?? []), e.from]);
    return m;
  }, [board.edges]);
  /** Nodes in reading order (roots first, then breadth-first). */
  const order = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    const queue = nodes.filter((n) => !parentsOf.has(n.id)).sort((a, b) => (a.kind === "idea" ? -1 : 0) - (b.kind === "idea" ? -1 : 0)).map((n) => n.id);
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      queue.push(...(kids.get(id) ?? []));
    }
    return [...out, ...nodes.filter((n) => !seen.has(n.id)).map((n) => n.id)];
  }, [nodes, parentsOf, kids]);
  /** A card shows when it is a root, or when one of its parents is showing and open. */
  const visible = useMemo(() => {
    const shut = new Set(collapsed);
    const vis = new Set<string>();
    const queue = nodes.filter((n) => !parentsOf.has(n.id)).map((n) => n.id);
    while (queue.length) {
      const id = queue.shift()!;
      if (vis.has(id)) continue;
      vis.add(id);
      if (!shut.has(id)) queue.push(...(kids.get(id) ?? []));
    }
    // Cards caught in a loop with no root stay visible.
    for (const n of nodes) if (!vis.has(n.id) && ![...(parentsOf.get(n.id) ?? [])].some((p) => byId.has(p))) vis.add(n.id);
    return vis;
  }, [nodes, parentsOf, kids, collapsed, byId]);
  /** The clicked card's line: everything it comes from and everything that branches from it. */
  const line = useMemo(() => {
    if (!focusMode || !selected || !visible.has(selected)) return null;
    const set = new Set<string>([selected]);
    const walk = (id: string, map: Map<string, string[]>) => {
      for (const next of map.get(id) ?? []) if (!set.has(next)) {
        set.add(next);
        walk(next, map);
      }
    };
    walk(selected, parentsOf);
    walk(selected, kids);
    return set;
  }, [focusMode, selected, visible, parentsOf, kids]);
  const shownNodes = useMemo(() => nodes.filter((n) => visible.has(n.id)), [nodes, visible]);
  const toggleLine = (id: string) => {
    unfollowRef.current();
    const open = collapsed.includes(id);
    setCollapsed((c) => (open ? c.filter((x) => x !== id) : [...c, id]));
    if (open) setSelected(id);
  };
  const vertical = original.layout === "vertical";
  /** Smooth camera move to a card, so following the lines feels like travelling along them. */
  const anim = useRef(0);
  const flyTo = (id: string) => {
    const n = byId.get(id);
    const el = stage.current;
    if (!n || !el) return;
    const sz = sizes[id] ?? { w: NODE_W[n.kind], h: 200 };
    const from = view;
    const z = Math.max(from.z, Math.min(0.9, (el.clientWidth * 0.5) / sz.w));
    const to = { z, x: el.clientWidth / 2 - ((n.x ?? 0) + sz.w / 2) * z, y: el.clientHeight / 2 - ((n.y ?? 0) + sz.h / 2) * z };
    cancelAnimationFrame(anim.current);
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 520);
      const e = 1 - Math.pow(1 - k, 3);
      setView({ z: from.z + (to.z - from.z) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e });
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };
  /** Select a card and travel to it; opens its branch first if it was collapsed away. */
  const goTo = (id: string) => {
    if (!visible.has(id)) {
      const opened = new Set<string>();
      const up = (x: string) => (parentsOf.get(x) ?? []).forEach((p) => {
        if (!opened.has(p)) {
          opened.add(p);
          up(p);
        }
      });
      up(id);
      setCollapsed((c) => c.filter((x) => !opened.has(x)));
    }
    setSelected(id);
    setTimeout(() => flyTo(id), visible.has(id) ? 0 : 60);
  };
  const flowFrom = (id: string) => (parentsOf.get(id) ?? []).map((p) => byId.get(p)).filter((x): x is BoardNode => !!x);
  const flowTo = (id: string) => (kids.get(id) ?? []).map((k) => byId.get(k)).filter((x): x is BoardNode => !!x);
  /** Next card along the flow: its first branch, else the next card in reading order. */
  const stepFlow = (dir: 1 | -1) => {
    unfollowRef.current();
    const cur = selected ?? order[0];
    if (!cur) return;
    if (!selected) return goTo(cur);
    if (dir === 1) {
      const next = flowTo(cur)[0]?.id ?? order[order.indexOf(cur) + 1];
      if (next) goTo(next);
    } else {
      const prev = flowFrom(cur)[0]?.id ?? order[order.indexOf(cur) - 1];
      if (prev) goTo(prev);
    }
  };
  const setOrientation = (layout: "horizontal" | "vertical") => {
    commit((b) => {
      if (layout === "vertical") b.layout = "vertical";
      else delete b.layout;
      layoutBoard(b, true);
      b.arranged = false;
    });
    setTimeout(() => fitRef.current(), 80);
  };
  /** Clicking a highlighted word lights up the card it names (title first, then text) and travels there. */
  const onWord = (word: string, from: string) => {
    unfollowRef.current();
    const w = word.toLowerCase().replace(/[.,;:!?"“”]/g, "").trim();
    if (!w) return;
    const clean = (s?: string) => (s ?? "").toLowerCase().replace(/==/g, "");
    const byTitle = nodes.filter((n) => n.id !== from && clean(n.title).includes(w));
    const byText = nodes.filter((n) => n.id !== from && !byTitle.includes(n) && (clean(n.text).includes(w) || (n.items ?? []).some((i) => clean(i.text).includes(w))));
    const hits = byTitle.length ? byTitle : byText;
    if (!hits.length) {
      toast(t("board.wordNone", { w: word }));
      return;
    }
    setWordHits({ word, ids: new Set([from, ...hits.map((n) => n.id)]) });
    goTo(hits[0]!.id);
  };
  const centerOn = (id: string) => {
    const n = byId.get(id);
    const el = stage.current;
    if (!n || !el) return;
    const sz = sizes[id] ?? { w: NODE_W[n.kind], h: 200 };
    setView((v) => ({ ...v, x: el.clientWidth / 2 - ((n.x ?? 0) + sz.w + 200) * v.z, y: el.clientHeight / 2 - ((n.y ?? 0) + sz.h / 2) * v.z }));
  };
  const anyCollapsed = collapsed.some((id) => visible.has(id));
  const collapseAll = () => {
    unfollowRef.current();
    setCollapsed([...kids.keys()]);
    setSelected(null);
    setTimeout(() => fitRef.current(), 80);
  };
  const expandAll = () => {
    unfollowRef.current();
    setCollapsed([]);
    setTimeout(() => fitRef.current(), 80);
  };
  /** Presenting: opens the next closed line in reading order and moves to it. */
  const openNext = () => {
    unfollowRef.current();
    const id = order.find((x) => visible.has(x) && collapsed.includes(x));
    if (!id) return;
    setCollapsed((c) => c.filter((x) => x !== id));
    setSelected(id);
    centerOn(id);
  };
  const pos = (n: BoardNode) => ({ x: (n.x ?? 0) + (drag?.id === n.id ? drag.dx : 0), y: (n.y ?? 0) + (drag?.id === n.id ? drag.dy : 0) });
  const sizeOf = (n: BoardNode) => sizes[n.id] ?? { w: NODE_W[n.kind], h: 160 };
  const videos = useMemo(() => {
    const o = outline(board);
    const order = [...o.stages.flatMap((s) => s.items), ...o.loose].filter((n) => n.kind === "video").map((n) => n.id);
    return nodes.filter((n) => n.kind === "video").sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }, [board, nodes]);
  const stageOf = useCallback(
    (nid: string) => {
      const s = outline(board).stages.find((s) => s.items.some((i) => i.id === nid));
      return s ? `${String(s.stage.step ?? "").padStart(2, "0")} · ${s.stage.title}` : undefined;
    },
    [board],
  );

  const commit = useCallback((fn: (b: Board) => Board | void) => updateBoard(board.id, (b) => fn(b) ?? b), [board.id]);

  /* ───── measuring cards (for the connection ports) ───── */
  const observer = useRef<ResizeObserver | null>(null);
  if (!observer.current && typeof ResizeObserver !== "undefined") {
    observer.current = new ResizeObserver((entries) => {
      setSizes((prev) => {
        const next = { ...prev };
        for (const e of entries) {
          const nid = (e.target as HTMLElement).dataset.node!;
          const el = e.target as HTMLElement;
          next[nid] = { w: el.offsetWidth, h: el.offsetHeight };
        }
        return next;
      });
    });
  }
  useEffect(() => () => observer.current?.disconnect(), []);
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (el) observer.current?.observe(el);
  }, []);

  /* ───── view ───── */
  const fit = useCallback(() => {
    const el = stage.current;
    const list = shownNodes.length ? shownNodes : nodes;
    if (!el || !list.length) return;
    const xs = list.map((n) => n.x ?? 0), ys = list.map((n) => n.y ?? 0);
    const x2 = list.map((n) => (n.x ?? 0) + (sizes[n.id]?.w ?? NODE_W[n.kind]));
    const y2 = list.map((n) => (n.y ?? 0) + (sizes[n.id]?.h ?? 200));
    const minX = Math.min(...xs) - 80, minY = Math.min(...ys) - 80, maxX = Math.max(...x2) + 80, maxY = Math.max(...y2) + 140;
    const z = Math.max(0.2, Math.min(1.1, el.clientWidth / (maxX - minX), el.clientHeight / (maxY - minY)));
    setView({ z, x: (el.clientWidth - (maxX - minX) * z) / 2 - minX * z, y: (el.clientHeight - (maxY - minY) * z) / 2 - minY * z });
  }, [nodes, shownNodes, sizes]);

  const fitRef = useRef(fit);
  fitRef.current = fit;

  useLayoutEffect(() => {
    if (fitted.current || mode !== "map") return;
    if (nodes.length && Object.keys(sizes).length >= Math.min(nodes.length, 1)) {
      fitted.current = true;
      fit();
    }
  }, [fit, nodes.length, sizes, mode]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      unfollowRef.current();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        const px = e.clientX - r.left, py = e.clientY - r.top;
        setView((v) => {
          const z = Math.max(0.15, Math.min(2.5, v.z * Math.exp(-Math.max(-25, Math.min(25, e.deltaY)) * 0.01)));
          return { z, x: px - ((px - v.x) / v.z) * z, y: py - ((py - v.y) / v.z) * z };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mode]);

  /* A reader who moves around on their own stops following the host (one tap brings it back). */
  const unfollow = () => {
    if (!owner) setFollow(false);
  };
  const unfollowRef = useRef(unfollow);
  unfollowRef.current = unfollow;

  /* ───── pointer: pan the canvas, drag cards ───── */
  const gesture = useRef<{ kind: "pan" | "node" | "resize"; id?: string; sx: number; sy: number; vx: number; vy: number; moved: boolean; pts: Map<number, { x: number; y: number }>; pinch?: number } | null>(null);

  const onStageDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    const g = gesture.current;
    if (g?.pts && e.pointerType === "touch" && g.pts.size === 1) {
      g.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...g.pts.values()];
      g.pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      return;
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    gesture.current = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false, pts: new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]) };
  };

  const onNodeDown = (e: RPointerEvent<HTMLDivElement>, nid: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (tool === "pan" || !owner) return onStageDown(e);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = { kind: "node", id: nid, sx: e.clientX, sy: e.clientY, vx: 0, vy: 0, moved: false, pts: new Map() };
  };

  const lastTap = useRef({ id: "", t: 0 });
  const onResizeDown = (e: RPointerEvent<HTMLDivElement>, n: BoardNode) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const sz = sizeOf(n);
    gesture.current = { kind: "resize", id: n.id, sx: e.clientX, sy: e.clientY, vx: sz.w, vy: sz.h, moved: false, pts: new Map() };
  };

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "resize") {
      g.moved = true;
      setResize({ id: g.id!, w: Math.max(140, Math.round(g.vx + (e.clientX - g.sx) / view.z)), h: Math.max(60, Math.round(g.vy + (e.clientY - g.sy) / view.z)) });
      return;
    }
    if (g.pinch && g.pts.has(e.pointerId)) {
      g.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...g.pts.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const r = stage.current!.getBoundingClientRect();
      const px = (a!.x + b!.x) / 2 - r.left, py = (a!.y + b!.y) / 2 - r.top;
      const k = d / g.pinch;
      g.pinch = d;
      setView((v) => {
        const z = Math.max(0.15, Math.min(2.5, v.z * k));
        return { z, x: px - ((px - v.x) / v.z) * z, y: py - ((py - v.y) / v.z) * z };
      });
      return;
    }
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < 4) return;
    if (!g.moved) unfollow();
    g.moved = true;
    if (g.kind === "pan") setView((v) => ({ ...v, x: g.vx + dx, y: g.vy + dy }));
    else if (tool === "select") setDrag({ id: g.id!, dx: dx / view.z, dy: dy / view.z });
  };

  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    g.pts.delete(e.pointerId);
    if (g.pinch) {
      if (g.pts.size === 0) gesture.current = null;
      return;
    }
    gesture.current = null;
    if (g.kind === "resize") {
      const r = resize;
      setResize(null);
      if (r)
        commit((b) => {
          const n = b.nodes.find((x) => x.id === r.id);
          if (n) {
            n.w = r.w;
            n.h = r.h;
          }
          b.arranged = true;
        });
      return;
    }
    if (g.kind === "pan") {
      if (!g.moved) {
        setSelected(null);
        setLinkFrom(null);
        setWordHits(null);
      }
      return;
    }
    const nid = g.id!;
    if (g.moved && drag) {
      const { dx, dy } = drag;
      setDrag(null);
      commit((b) => {
        const n = b.nodes.find((x) => x.id === nid);
        b.arranged = true;
        if (n) {
          n.x = Math.round((n.x ?? 0) + dx);
          n.y = Math.round((n.y ?? 0) + dy);
        }
      });
      return;
    }
    setDrag(null);
    if (tool === "connect") {
      if (!linkFrom) {
        setLinkFrom(nid);
        toast(t("board.connectPick"));
      } else if (linkFrom !== nid) {
        const from = linkFrom;
        commit((b) => {
          if (!b.edges.some((x) => x.from === from && x.to === nid)) b.edges.push({ id: newId("e_"), from, to: nid });
        });
        setLinkFrom(null);
      }
      return;
    }
    // Double tap (pointer capture swallows the browser's dblclick): write in the card, play a video, or travel to it.
    const now = Date.now();
    if (lastTap.current.id === nid && now - lastTap.current.t < 420) {
      lastTap.current = { id: "", t: 0 };
      const n = byId.get(nid);
      if (n?.kind === "video") play(nid);
      else if (owner && lang === "original") setEditingNode(nid);
      else flyTo(nid);
      return;
    }
    lastTap.current = { id: nid, t: now };
    setSelected(nid);
    setPanel(true);
  };

  /* ───── edits ───── */
  const addCard = (kind: NodeKind) => {
    const el = stage.current!;
    const parent = selected ? byId.get(selected) : undefined;
    const nid = newId();
    const node: BoardNode = { id: nid, kind, title: kind === "stage" ? t("board.step", { n: board.nodes.filter((n) => n.kind === "stage").length + 1 }) : "" };
    if (kind === "stage") node.step = board.nodes.filter((n) => n.kind === "stage").length + 1;
    if (kind === "list") node.items = [];
    if (parent) {
      const siblings = board.edges.filter((e) => e.from === parent.id).length;
      node.x = (parent.x ?? 0) + sizeOf(parent).w + 120;
      node.y = (parent.y ?? 0) + siblings * 60;
    } else {
      node.x = Math.round((el.clientWidth / 2 - view.x) / view.z - NODE_W[kind] / 2);
      node.y = Math.round((el.clientHeight / 2 - view.y) / view.z - 100);
    }
    commit((b) => {
      b.nodes.push(node);
      if (parent) b.edges.push({ id: newId("e_"), from: parent.id, to: nid });
    });
    setSelected(nid);
    setPanel(true);
    setMode("map");
  };

  const patchNode = (nid: string, patch: Partial<BoardNode>) =>
    commit((b) => {
      const i = b.nodes.findIndex((n) => n.id === nid);
      if (i >= 0) b.nodes[i] = { ...b.nodes[i]!, ...patch };
    });

  const deleteNode = (nid: string) => {
    const before = structuredClone(original);
    commit((b) => {
      b.nodes = b.nodes.filter((n) => n.id !== nid);
      b.edges = b.edges.filter((e) => e.from !== nid && e.to !== nid);
    });
    setSelected(null);
    toast(t("board.deleted"), { action: { label: t("common.undo"), onClick: () => saveBoard(before) } });
  };

  const tidy = () => {
    commit((b) => {
      layoutBoard(b, true);
      b.arranged = false;
    });
    setTimeout(fit, 60);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || player !== null) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected && byId.get(selected)?.kind !== "idea") deleteNode(selected);
      if (e.key === "Escape") {
        setSelected(null);
        setLinkFrom(null);
        setWordHits(null);
      }
      if (e.key === "v") setTool("select");
      if (e.key === "h") setTool("pan");
      if (e.key === "c") setTool("connect");
      if (e.key === "f") fit();
      if (e.key === "n") openNext();
      if (e.key === "Enter" && owner && selected && lang === "original" && byId.get(selected)?.kind !== "video") {
        e.preventDefault();
        setEditingNode(selected);
      }
      if (mode === "map" && (e.key === "ArrowRight" || e.key === "ArrowDown")) {
        e.preventDefault();
        stepFlow(1);
      }
      if (mode === "map" && (e.key === "ArrowLeft" || e.key === "ArrowUp")) {
        e.preventDefault();
        stepFlow(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ───── live: the owner leads, readers follow ───── */
  const broadcastRef = useRef<() => void>(() => {});
  const onSync = useCallback((m: SyncMessage) => {
    if (m.t === "board") setLive(m);
    if (m.t === "hello" && m.role === "viewer") broadcastRef.current();
  }, []);
  const sync = useSync(`board:${original.id}`, owner ? "presenter" : "viewer", onSync);
  const lastCenter = useRef({ cx: 0, cy: 0, span: 1200 });
  broadcastRef.current = () => {
    if (!owner) return;
    const el = stage.current;
    if (el && mode === "map") lastCenter.current = { cx: (el.clientWidth / 2 - view.x) / view.z, cy: (el.clientHeight / 2 - view.y) / view.z, span: el.clientWidth / view.z };
    const me = moodStage.current;
    if (me && mode === "mood") lastCenter.current = { cx: (me.clientWidth / 2 - moodView.x) / moodView.z, cy: (me.clientHeight / 2 - moodView.y) / moodView.z, span: me.clientWidth / moodView.z };
    sync.send({ t: "board", mode, focus: selected, ...lastCenter.current, player: player !== null ? videos[player]?.id ?? null : null, collapsed, dim: focusMode });
  };
  useEffect(() => {
    if (!owner) return;
    const timer = setTimeout(() => broadcastRef.current(), 200);
    return () => clearTimeout(timer);
  }, [owner, view, moodView, mode, selected, player, collapsed, focusMode]);
  useEffect(() => {
    if (!owner) return;
    const timer = setInterval(() => broadcastRef.current(), 4000);
    return () => clearInterval(timer);
  }, [owner]);

  const following = !owner && follow && live !== null;
  useEffect(() => {
    if (!following || !live) return;
    setMode(live.mode);
    setSelected(live.focus);
    setCollapsed(live.collapsed ?? []);
    setFocusMode(live.dim ?? true);
    const el = stage.current;
    if (live.mode === "map" && el) {
      const z = Math.max(0.15, Math.min(2.5, el.clientWidth / Math.max(200, live.span)));
      fitted.current = true;
      setView({ z, x: el.clientWidth / 2 - live.cx * z, y: el.clientHeight / 2 - live.cy * z });
    }
    const me = moodStage.current;
    if (live.mode === "mood" && me) {
      const z = Math.max(0.1, Math.min(4, me.clientWidth / Math.max(200, live.span)));
      setMoodView({ z, x: me.clientWidth / 2 - live.cx * z, y: me.clientHeight / 2 - live.cy * z });
    }
    const i = live.player ? videos.findIndex((v) => v.id === live.player) : -1;
    setPlayer(i >= 0 ? i : null);
  }, [following, live, videos, mode]);

  useEffect(() => {
    if (failed) toast(t("board.translateFailed"));
  }, [failed, t]);

  const play = (nid?: string) => {
    if (!videos.length) return;
    unfollow();
    setPlayer(Math.max(0, videos.findIndex((v) => v.id === nid)));
  };

  /* ───── edges ───── */
  const edgePaths = board.edges.flatMap((e) => {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b || !visible.has(a.id) || !visible.has(b.id)) return [];
    const pa = pos(a), pb = pos(b), sa = sizeOf(a), sb = sizeOf(b);
    let s: [number, number], d: [number, number], path: string;
    if (vertical && pb.y >= pa.y + sa.h * 0.6) {
      s = [pa.x + sa.w / 2, pa.y + sa.h];
      d = [pb.x + sb.w / 2, pb.y];
      const k = Math.max(40, (d[1] - s[1]) / 2);
      path = `M${s[0]},${s[1]} C${s[0]},${s[1] + k} ${d[0]},${d[1] - k} ${d[0]},${d[1]}`;
    } else if (pb.x >= pa.x + sa.w * 0.6) {
      s = [pa.x + sa.w, pa.y + sa.h / 2];
      d = [pb.x, pb.y + sb.h / 2];
      const k = Math.max(50, (d[0] - s[0]) / 2);
      path = `M${s[0]},${s[1]} C${s[0] + k},${s[1]} ${d[0] - k},${d[1]} ${d[0]},${d[1]}`;
    } else if (pb.x + sb.w <= pa.x - sa.w * 0.1) {
      s = [pa.x, pa.y + sa.h / 2];
      d = [pb.x + sb.w, pb.y + sb.h / 2];
      const k = Math.max(50, (s[0] - d[0]) / 2);
      path = `M${s[0]},${s[1]} C${s[0] - k},${s[1]} ${d[0] + k},${d[1]} ${d[0]},${d[1]}`;
    } else {
      const down = pb.y > pa.y;
      s = [pa.x + sa.w / 2, down ? pa.y + sa.h : pa.y];
      d = [pb.x + sb.w / 2, down ? pb.y : pb.y + sb.h];
      const k = Math.max(40, Math.abs(d[1] - s[1]) / 2) * (down ? 1 : -1);
      path = `M${s[0]},${s[1]} C${s[0]},${s[1] + k} ${d[0]},${d[1] - k} ${d[0]},${d[1]}`;
    }
    const inLine = wordHits ? wordHits.ids.has(e.from) && wordHits.ids.has(e.to) : line ? line.has(e.from) && line.has(e.to) : null;
    return [{ e, s, d, path, opacity: inLine === null ? (selected === e.from || selected === e.to ? 0.9 : 0.45) : inLine ? 0.95 : 0.07 }];
  });

  const sel = selected ? original.nodes.find((n) => n.id === selected) : undefined;
  if (editingNode && editingNode !== selected) setTimeout(() => setEditingNode(null));
  const childCount = (nid: string) => board.edges.filter((e) => e.from === nid).length;

  return (
    <div className="fixed inset-0 flex bg-background text-foreground">
      <div className="relative min-w-0 flex-1 overflow-hidden">
        {mode === "map" ? (
          <div
            ref={stage}
            className={cn("absolute inset-0 touch-none select-none", tool === "pan" ? "cursor-grab active:cursor-grabbing" : tool === "connect" ? "cursor-crosshair" : "cursor-default")}
            style={{
              backgroundImage: "radial-gradient(circle, color-mix(in srgb, var(--foreground) 22%, transparent) 1px, transparent 1.2px)",
              backgroundSize: `${22 * view.z}px ${22 * view.z}px`,
              backgroundPosition: `${view.x}px ${view.y}px`,
            }}
            onPointerDown={onStageDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
              <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1">
                {edgePaths.map(({ e, s, d, path, opacity }) => (
                  <g key={e.id} className="text-foreground transition-opacity duration-300" opacity={opacity}>
                    {/* Wide invisible stroke: clicking a line highlights it. */}
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={18 / Math.max(view.z, 0.4)}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onPointerDown={(ev) => ev.stopPropagation()}
                      onClick={() => {
                        unfollow();
                        goTo(selected === e.to ? e.from : e.to);
                      }}
                    />
                    <path d={path} fill="none" stroke="currentColor" strokeWidth={(opacity > 0.9 ? 2.2 : 1.5) / Math.max(view.z, 0.6)} strokeDasharray="1 6" strokeLinecap="round" />
                    <circle cx={s[0]} cy={s[1]} r={4} fill="var(--background)" stroke="currentColor" strokeWidth={1.5} />
                    <circle cx={d[0]} cy={d[1]} r={4} fill="currentColor" />
                    {e.label && (
                      <text x={(s[0] + d[0]) / 2} y={(s[1] + d[1]) / 2 - 8} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px] uppercase">
                        {e.label}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
              {shownNodes.map((n) => {
                const p = pos(n);
                const branches = kids.get(n.id)?.length ?? 0;
                const shut = collapsed.includes(n.id);
                const dim = wordHits ? !wordHits.ids.has(n.id) : line !== null && !line.has(n.id);
                const hit = wordHits?.ids.has(n.id) && wordHits.ids.size > 1;
                return (
                  <div
                    key={n.id}
                    data-node={n.id}
                    ref={measure}
                    className={cn("absolute", tool === "select" && "cursor-grab active:cursor-grabbing", (linkFrom === n.id || hit) && "outline-2 outline-dashed outline-offset-8")}
                    style={{ left: p.x, top: p.y, zIndex: drag?.id === n.id ? 5 : selected === n.id ? 4 : 1, outlineColor: accent, opacity: dim ? 0.16 : 1, transition: "opacity 0.3s" }}
                    onPointerDown={(e) => onNodeDown(e, n.id)}
                  >
                    <NodeCard
                      node={owner && editingNode === n.id ? original.nodes.find((x) => x.id === n.id) ?? n : n}
                      editing={owner && editingNode === n.id}
                      onEdit={(p) => patchNode(n.id, p)}
                      onDone={() => setEditingNode(null)}
                      size={resize?.id === n.id ? { w: resize.w, h: resize.h } : undefined}
                      onWord={(w) => onWord(w, n.id)}
                      accent={accent}
                      selected={selected === n.id}
                      childCount={childCount(n.id)}
                      onPlay={(vid) => (tool === "select" ? play(vid) : undefined)}
                      onToggleItem={(i) => owner && patchNode(n.id, { items: (original.nodes.find((x) => x.id === n.id)?.items ?? []).map((it, j) => (j === i ? { ...it, done: !it.done } : it)) })}
                    />
                    {owner && selected === n.id && editingNode !== n.id && (
                      <div
                        title={t("board.resize")}
                        onPointerDown={(e) => onResizeDown(e, n)}
                        className="absolute z-20 cursor-nwse-resize border-2 bg-background"
                        style={{ right: -7 / view.z, bottom: -7 / view.z, width: 14 / view.z, height: 14 / view.z, borderColor: accent }}
                      />
                    )}
                    {branches > 0 && (
                      <button
                        type="button"
                        onPointerDown={(ev) => ev.stopPropagation()}
                        onClick={() => toggleLine(n.id)}
                        title={shut ? t("board.expand", { n: branches }) : t("board.collapse")}
                        aria-label={shut ? t("board.expand", { n: branches }) : t("board.collapse")}
                        className={cn(
                          "label-xs absolute z-10 flex h-7 min-w-7 items-center justify-center gap-0.5 border px-1.5 text-[11px] transition-colors",
                          vertical ? "-bottom-[2.6rem] left-1/2 -translate-x-1/2" : "top-1/2 -right-[2.6rem] -translate-y-1/2",
                          shut ? "border-transparent text-white" : "border-border bg-card text-muted-foreground hover:text-foreground",
                        )}
                        style={shut ? { background: accent } : undefined}
                      >
                        {shut ? <>+{branches}</> : <Minus className="size-3.5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : mode === "mood" ? (
          <Moodboard
            items={board.mood?.items ?? []}
            original={original.mood?.items ?? []}
            accent={accent}
            readOnly={!owner}
            view={moodView}
            setView={setMoodView}
            stageRef={moodStage}
            onChange={(next) =>
              commit((b) => {
                b.mood = { items: next };
              })
            }
            onUserMove={unfollow}
            mapNodes={original.nodes}
          />
        ) : (
          <KanbanView board={board} onPlay={play} onSelect={(nid) => { unfollow(); setSelected(nid); setPanel(true); }} />
        )}

        {/* Instagram profiles mentioned on the board: always on screen. */}
        <ProfilesDock
          board={board}
          onGo={(s) => {
            unfollow();
            if (s.kind === "node") {
              setMode("map");
              setTimeout(() => goTo(s.id), 60);
            } else if (s.kind === "mood") setMode("mood");
          }}
          onAddToMood={
            owner
              ? (item) => {
                  setMode("mood");
                  setTimeout(() => window.dispatchEvent(new CustomEvent("xlide:mood-add", { detail: item })), 150);
                }
              : undefined
          }
        />

        {/* Top-left: board name */}
        <div className="absolute top-3 left-3 flex max-w-[calc(100%-15rem)] items-center gap-1 border border-border bg-card/90 p-1 pr-3 backdrop-blur sm:top-4 sm:left-4 sm:max-w-[calc(100%-26rem)] xl:max-w-[calc(100%-36rem)]">
          {owner ? (
            <Button asChild variant="ghost" size="icon-sm" aria-label={t("nav.back")}>
              <Link to="/boards">
                <ArrowLeft />
              </Link>
            </Button>
          ) : (
            <span className="grid size-8 place-items-center" aria-label="XLIDE">
              <LogoGlyph className="size-5" />
            </span>
          )}
          <span className="hidden size-8 shrink-0 place-items-center text-white sm:grid" style={{ background: accent }}>
            <Network className="size-4" />
          </span>
          <input
            value={owner && lang === "original" ? original.title : board.title}
            readOnly={!owner || lang !== "original"}
            onChange={(e) =>
              commit((b) => {
                b.title = e.target.value;
                const idea = b.nodes.find((n) => n.kind === "idea");
                if (idea && (idea.title === original.title || !idea.title)) idea.title = e.target.value;
              })
            }
            className="min-w-0 shrink truncate bg-transparent px-1 text-sm font-medium outline-none"
            style={{ width: `${Math.max(6, board.title.length + 1)}ch` }}
            aria-label={t("board.field.title")}
          />
          <span
            className="label-xs ml-1 hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-muted-foreground lg:flex"
            title={owner ? t("board.viewers", { n: sync.presence.viewer }) : t("board.readOnly")}
          >
            <span className={cn("size-1.5", sync.status === "live" && "animate-pulse")} style={{ background: sync.status === "live" ? accent : "var(--muted-foreground)" }} />
            {owner ? (
              sync.presence.viewer > 0 ? (
                <>
                  <Eye className="size-3.5" /> {sync.presence.viewer}
                </>
              ) : (
                t("board.live")
              )
            ) : (
              t("board.readOnly")
            )}
          </span>
        </div>

        {/* Top-right: view + connect */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 sm:top-4 sm:right-4">
          <div className="flex border border-border bg-card/90 p-0.5 backdrop-blur">
            {(["map", "mood", "kanban"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  unfollow();
                  setMode(m);
                }}
                className={cn("label-xs flex h-8 items-center gap-1.5 px-2.5", mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {m === "map" ? <Workflow className="size-3.5" /> : m === "mood" ? <Shapes className="size-3.5" /> : <Columns3 className="size-3.5" />}
                <span className="hidden md:inline">{m === "map" ? t("board.map") : m === "mood" ? t("board.moodboard") : t("board.kanban")}</span>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="h-9 bg-card/90 px-2.5"
            onClick={() => setAutoplay(!autoplay)}
            aria-pressed={autoplay}
            title={autoplay ? t("board.autoplayOn") : t("board.autoplayOff")}
            aria-label={autoplay ? t("board.autoplayOn") : t("board.autoplayOff")}
          >
            {autoplay ? <PlayCircle /> : <Pause />}
          </Button>
          <LangMenu lang={lang} onChange={setLang} busy={translating} />
          {owner ? (
            <>
              <Button onClick={() => setShareOpen(true)} className="h-9">
                <Share2 /> <span className="hidden sm:inline">{t("board.share")}</span>
              </Button>
              <Button variant="outline" onClick={() => setConnectOpen(true)} className="h-9 bg-card/90" title={t("board.connect")}>
                <Cable /> <span className="hidden 2xl:inline">{t("board.connect")}</span>
              </Button>
            </>
          ) : (
            <Button
              variant={following ? "default" : "outline"}
              className={cn("h-9", !following && "bg-card/90")}
              onClick={() => setFollow(true)}
              title={following ? t("board.following") : t("board.follow")}
            >
              <Radio className={cn(following && "animate-pulse")} />
              <span className="hidden sm:inline">{live === null ? t("board.waiting") : following ? t("board.following") : t("board.follow")}</span>
            </Button>
          )}
          <Button variant="outline" size="icon" className="size-9 bg-card/90" onClick={() => setPanel((p) => !p)} aria-label={t("board.panel")}>
            <PanelRight />
          </Button>
        </div>

        {wordHits && mode === "map" && (
          <button
            type="button"
            onClick={() => setWordHits(null)}
            className="label-xs absolute top-16 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 border border-border bg-card/95 px-3 py-2 shadow-[0_12px_30px_-16px_rgb(0_0_0/0.4)] backdrop-blur sm:top-20"
          >
            <span className="px-1 normal-case" style={{ background: `color-mix(in srgb, ${accent} 30%, transparent)` }}>{wordHits.word}</span>
            {t("board.wordCards", { n: wordHits.ids.size - 1 })} · Esc
          </button>
        )}

        {/* Flow bar: where the selected card comes from and where its lines go. */}
        {mode === "map" && selected && byId.get(selected) && (
          <div className="absolute bottom-20 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-1 border border-border bg-card/95 p-1 text-sm shadow-[0_18px_40px_-20px_rgb(0_0_0/0.4)] backdrop-blur">
            {flowFrom(selected).slice(0, 1).map((p) => (
              <button key={p.id} type="button" onClick={() => { unfollow(); goTo(p.id); }} className="flex h-9 max-w-40 items-center gap-1.5 px-2.5 text-muted-foreground hover:bg-accent hover:text-foreground" title={`${t("board.flow.back")} (←)`}>
                <ChevronLeft className="size-4 shrink-0" /> <span className="truncate">{p.title || t(`board.kind.${p.kind}`)}</span>
              </button>
            ))}
            <span className="label-xs flex h-9 max-w-48 items-center gap-1.5 bg-foreground px-3 text-background">
              <span className="truncate">{byId.get(selected)!.title || t(`board.kind.${byId.get(selected)!.kind}`)}</span>
            </span>
            <div className="no-scrollbar flex max-w-[50vw] items-center gap-1 overflow-x-auto">
              {flowTo(selected).slice(0, 8).map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { unfollow(); goTo(c.id); }}
                  className="flex h-9 max-w-44 shrink-0 items-center gap-1.5 px-2.5 hover:bg-accent"
                  title={i === 0 ? `${t("board.flow.next")} (→)` : t("board.flow.goTo")}
                >
                  {i === 0 && <ArrowRight className="size-3.5 shrink-0" style={{ color: accent }} />}
                  <span className="truncate">{c.title || t(`board.kind.${c.kind}`)}</span>
                </button>
              ))}
              {flowTo(selected).length === 0 && order[order.indexOf(selected) + 1] && (
                <button type="button" onClick={() => stepFlow(1)} className="flex h-9 items-center gap-1.5 px-2.5 text-muted-foreground hover:bg-accent hover:text-foreground" title={`${t("board.flow.next")} (→)`}>
                  {t("board.flow.next")} <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom toolbar */}
        <div className={cn("absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 border border-border bg-card/95 p-1 shadow-[0_18px_40px_-20px_rgb(0_0_0/0.4)] backdrop-blur pb-safe sm:pb-1", mode === "mood" && "hidden")}>
          {mode === "map" &&
            owner &&
            ([
              ["select", MousePointer2, t("board.tool.select")],
              ["pan", Hand, t("board.tool.pan")],
              ["connect", Spline, t("board.tool.connect")],
            ] as const).map(([k, Icon, label]) => (
              <button
                key={k}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => {
                  setTool(k);
                  setLinkFrom(null);
                }}
                className={cn("grid size-10 place-items-center", tool === k ? "bg-foreground text-background" : "hover:bg-accent")}
              >
                <Icon className="size-4" />
              </button>
            ))}
          {mode === "map" && (
            <>
              <button type="button" title={t("board.tool.fit")} aria-label={t("board.tool.fit")} onClick={fit} className="grid size-10 place-items-center hover:bg-accent">
                <Maximize className="size-4" />
              </button>
              <button
                type="button"
                title={t("board.tool.focus")}
                aria-label={t("board.tool.focus")}
                aria-pressed={focusMode}
                onClick={() => {
                  unfollow();
                  setFocusMode((f) => !f);
                }}
                className={cn("grid size-10 place-items-center", focusMode ? "bg-foreground text-background" : "hover:bg-accent")}
              >
                <Focus className="size-4" />
              </button>
              <button
                type="button"
                title={anyCollapsed ? t("board.tool.expandAll") : t("board.tool.collapseAll")}
                aria-label={anyCollapsed ? t("board.tool.expandAll") : t("board.tool.collapseAll")}
                onClick={anyCollapsed ? expandAll : collapseAll}
                className="grid size-10 place-items-center hover:bg-accent"
              >
                {anyCollapsed ? <ChevronsUpDown className="size-4" /> : <ChevronsDownUp className="size-4" />}
              </button>
              {anyCollapsed && (
                <button
                  type="button"
                  title={t("board.tool.nextLine")}
                  onClick={openNext}
                  className="label-xs flex h-10 items-center gap-1.5 px-3 text-white"
                  style={{ background: accent }}
                >
                  <ListPlus className="size-4" /> <span className="hidden sm:inline">{t("board.tool.nextLine")}</span>
                </button>
              )}
              {owner && (
                <button
                  type="button"
                  title={vertical ? t("board.tool.horizontal") : t("board.tool.vertical")}
                  aria-label={vertical ? t("board.tool.horizontal") : t("board.tool.vertical")}
                  onClick={() => setOrientation(vertical ? "horizontal" : "vertical")}
                  className="grid size-10 place-items-center hover:bg-accent"
                >
                  {vertical ? <ArrowRightToLine className="size-4" /> : <ArrowDownToLine className="size-4" />}
                </button>
              )}
              {owner && (
                <button type="button" title={t("board.tool.tidy")} aria-label={t("board.tool.tidy")} onClick={tidy} className="grid size-10 place-items-center hover:bg-accent">
                  <Sparkles className="size-4" />
                </button>
              )}
              {(owner || videos.length > 0) && <span className="mx-1 h-6 border-l border-border" />}
            </>
          )}
          {videos.length > 0 && (
            <button type="button" title={t("board.watchAll")} onClick={() => play()} className="label-xs flex h-10 items-center gap-2 px-3 hover:bg-accent">
              <span className="relative size-5 overflow-hidden bg-[#111]">{videoPoster(videos[0]!) && <img src={videoPoster(videos[0]!)!} alt="" className="size-full object-cover" />}</span>
              {videos.length}
            </button>
          )}
          {owner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={t("board.add")} title={t("board.add")} className="grid size-10 place-items-center text-white" style={{ background: "var(--foreground)" }}>
                <Plus className="size-5 text-background" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end">
              {KINDS.filter((k) => k !== "idea").map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <DropdownMenuItem key={k} onSelect={() => addCard(k)}>
                    <Icon /> {t(`board.kind.${k}`)}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>

        {mode === "map" && (
          <span className="label-xs absolute bottom-6 left-4 hidden text-muted-foreground md:block">{Math.round(view.z * 100)}%</span>
        )}
      </div>

      {/* Side panel */}
      {panel && (
        <aside className="absolute inset-y-0 right-0 z-30 w-[min(100vw,22rem)] overflow-y-auto border-l border-border bg-card lg:static lg:z-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-3 lg:hidden">
            <span className="label-xs">{board.title}</span>
            <Button variant="ghost" size="sm" onClick={() => setPanel(false)}>
              {t("common.close")}
            </Button>
          </div>
          {owner && mode === "mood" ? (
            <MapPalette board={board} placed={new Set((original.mood?.items ?? []).map((i) => i.ref).filter((x): x is string => !!x))} />
          ) : owner && sel ? (
            <Inspector key={sel.id} node={sel} onChange={(p) => patchNode(sel.id, p)} onDelete={() => deleteNode(sel.id)} onDone={() => setSelected(null)} />
          ) : (
            <Overview
              board={board}
              onPlay={play}
              onSelect={(nid) => {
                unfollow();
                setSelected(nid);
                const n = byId.get(nid);
                const el = stage.current;
                if (n && el) setView((v) => ({ ...v, x: el.clientWidth / 2 - ((n.x ?? 0) + NODE_W[n.kind] / 2) * v.z, y: el.clientHeight / 2 - ((n.y ?? 0) + 100) * v.z }));
              }}
            />
          )}
        </aside>
      )}

      {player !== null && videos.length > 0 && (
        <ReelPlayer
          videos={videos}
          start={player}
          index={following ? player : undefined}
          onIndex={owner ? setPlayer : undefined}
          stageOf={stageOf}
          onClose={() => {
            unfollow();
            setPlayer(null);
          }}
        />
      )}

      {owner && <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />}
      {owner && <BoardShareDialog board={original} open={shareOpen} onOpenChange={setShareOpen} />}
    </div>
  );
}

/** Kanban: one column per funnel stage, point to point, with everything that hangs under it. */
function KanbanView({ board, onPlay, onSelect }: { board: Board; onPlay: (id: string) => void; onSelect: (id: string) => void }) {
  const { t } = usePrefs();
  const o = outline(board);
  const cols = [...o.stages.map((s, i) => ({ key: s.stage.id, head: s.stage, n: s.stage.step ?? i + 1, items: s.items })), ...(o.loose.length ? [{ key: "_loose", head: null, n: 0, items: o.loose }] : [])];
  return (
    <div className="absolute inset-0 overflow-auto pt-20 pb-28">
      <div className="flex min-h-full gap-4 px-4 sm:px-6">
        {cols.map((c, ci) => (
          <section key={c.key} className="w-72 shrink-0">
            <button type="button" onClick={() => c.head && onSelect(c.head.id)} className="flex w-full items-end gap-3 border-b border-foreground pb-3 text-left">
              <span className="font-mono text-3xl leading-none" style={{ color: board.accent }}>
                {c.head ? String(c.n).padStart(2, "0") : "··"}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium uppercase">{c.head ? c.head.title : t("board.loose")}</span>
                <span className="label-xs text-muted-foreground">{t("board.items", { n: c.items.length })}</span>
              </span>
              {ci < cols.length - 1 && <span className="label-xs ml-auto text-muted-foreground">→</span>}
            </button>
            {c.head?.text && <p className="mt-3 text-sm text-muted-foreground">{c.head.text}</p>}
            <div className="mt-4 space-y-3">
              {c.items.map((n) => (
                <MoodItem key={n.id} node={n} accent={board.accent} onPlay={onPlay} onSelect={onSelect} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function MoodItem({ node: n, accent, onPlay, onSelect }: { node: BoardNode; accent: string; onPlay: (id: string) => void; onSelect: (id: string) => void }) {
  if (n.kind === "video") {
    return (
      <div onDoubleClick={() => onPlay(n.id)}>
        <VideoTile url={n.video} poster={videoPoster(n)} title={n.title} onExpand={() => onPlay(n.id)} className="aspect-[9/16] w-full" />
      </div>
    );
  }
  if (n.kind === "media" && n.images?.length) {
    return (
      <button type="button" onClick={() => onSelect(n.id)} className="block w-full text-left">
        <div className={cn("grid gap-1", n.images.length > 1 && "grid-cols-2")}>
          {n.images.slice(0, 4).map((src, i) => (
            <img key={src + i} src={src} alt="" loading="lazy" className={cn("w-full object-cover", n.images!.length === 1 ? "aspect-[4/5]" : "aspect-square")} />
          ))}
        </div>
        <p className="mt-1.5 text-sm font-medium">{n.title}</p>
      </button>
    );
  }
  const Icon = KIND_ICON[n.kind];
  return (
    <button type="button" onClick={() => onSelect(n.id)} className={cn("block w-full border border-border p-4 text-left hover:border-foreground", n.kind === "note" ? "bg-muted" : "bg-card")}>
      <span className="label-xs flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" /> {n.tag ?? n.kind}
      </span>
      {n.kind === "metric" ? (
        <>
          <p className="mt-2 text-3xl font-medium tracking-tight">{n.value ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{n.title}</p>
        </>
      ) : (
        <p className="mt-2 font-medium">{n.title}</p>
      )}
      {n.text && n.kind !== "metric" && <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{n.text}</p>}
      {n.kind === "list" && (
        <ul className="mt-2 space-y-1 text-sm">
          {(n.items ?? []).map((it, i) => (
            <li key={i} className={cn("flex gap-2", it.done && "text-muted-foreground line-through")}>
              <span className="mt-1.5 size-2 shrink-0" style={{ background: it.done ? accent : "var(--border)" }} /> {it.text}
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}

function ConnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = usePrefs();
  const url = `${location.origin}/api/mcp?key=1423`;
  const copy = (s: string) => navigator.clipboard?.writeText(s).then(() => toast(t("board.copied")), () => {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[min(92vw,34rem)]">
        <DialogHeader>
          <DialogTitle>{t("board.connectTitle")}</DialogTitle>
          <DialogDescription>{t("board.connectHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-stretch border border-border">
            <code className="min-w-0 flex-1 truncate px-3 py-2.5 font-mono text-xs leading-5">{url}</code>
            <Button variant="secondary" className="h-auto" onClick={() => copy(url)}>
              {t("board.copy")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("board.connectKey")}</p>
          <div>
            <p className="label-xs text-muted-foreground">{t("board.promptExample")}</p>
            <button type="button" onClick={() => copy(t("board.promptText"))} className="mt-2 w-full bg-muted p-3 text-left text-sm hover:bg-accent">
              {t("board.promptText")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Content language: each person reads the board in their own language, whatever the others chose. */
function LangMenu({ lang, onChange, busy }: { lang: ContentLang; onChange: (l: ContentLang) => void; busy: boolean }) {
  const { t } = usePrefs();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-1.5 bg-card/90 px-2.5" title={t("board.language")} aria-label={t("board.language")}>
          {busy ? <Loader2 className="animate-spin" /> : <Languages />}
          <span className="label-xs">{lang === "original" ? t("board.original") : lang.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("board.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CONTENT_LANGS.map((l) => (
          <DropdownMenuItem key={l.code} onSelect={() => onChange(l.code)} className={cn(l.code === lang && "font-medium")}>
            <span className="label-xs w-7 text-muted-foreground">{l.code === "original" ? "··" : l.code.toUpperCase()}</span>
            {l.code === "original" ? t("board.original") : l.name}
            {l.code === lang && <span className="ml-auto size-1.5 bg-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
