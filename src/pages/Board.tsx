import {
  ArrowLeft, Cable, Hand, LayoutGrid, Maximize, MousePointer2, Network, PanelRight, Plus, Sparkles, Spline, Workflow,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { KINDS, layoutBoard, NODE_W, newId, outline, parseVideo } from "../../shared/board.js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { saveBoard, updateBoard, useBoard, type Board, type BoardNode, type NodeKind } from "@/lib/boards";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { KIND_ICON, NodeCard, videoPoster } from "./board/cards";
import { ReelPlayer } from "./board/reel-player";
import { Inspector, Overview } from "./board/side-panel";

type Tool = "select" | "pan" | "connect";
interface View { x: number; y: number; z: number }

export default function BoardPage() {
  const { id } = useParams();
  const board = useBoard(id);
  const { t } = usePrefs();
  if (!board) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="text-muted-foreground">{t("board.notFound")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/boards">
              <ArrowLeft /> {t("nav.boards")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  return <BoardCanvas board={board} />;
}

function BoardCanvas({ board }: { board: Board }) {
  const { t } = usePrefs();
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 1 });
  const [tool, setTool] = useState<Tool>("select");
  const [mode, setMode] = useState<"map" | "mood">("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const [panel, setPanel] = useState(() => window.innerWidth >= 1024);
  const [player, setPlayer] = useState<number | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const fitted = useRef(false);
  const accent = board.accent;

  const nodes = board.nodes;
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
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
    if (!el || !nodes.length) return;
    const xs = nodes.map((n) => n.x ?? 0), ys = nodes.map((n) => n.y ?? 0);
    const x2 = nodes.map((n) => (n.x ?? 0) + (sizes[n.id]?.w ?? NODE_W[n.kind]));
    const y2 = nodes.map((n) => (n.y ?? 0) + (sizes[n.id]?.h ?? 200));
    const minX = Math.min(...xs) - 80, minY = Math.min(...ys) - 80, maxX = Math.max(...x2) + 80, maxY = Math.max(...y2) + 140;
    const z = Math.max(0.2, Math.min(1.1, el.clientWidth / (maxX - minX), el.clientHeight / (maxY - minY)));
    setView({ z, x: (el.clientWidth - (maxX - minX) * z) / 2 - minX * z, y: (el.clientHeight - (maxY - minY) * z) / 2 - minY * z });
  }, [nodes, sizes]);

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
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        const px = e.clientX - r.left, py = e.clientY - r.top;
        setView((v) => {
          const z = Math.max(0.15, Math.min(2.5, v.z * Math.exp(-e.deltaY * 0.01)));
          return { z, x: px - ((px - v.x) / v.z) * z, y: py - ((py - v.y) / v.z) * z };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mode]);

  /* ───── pointer: pan the canvas, drag cards ───── */
  const gesture = useRef<{ kind: "pan" | "node"; id?: string; sx: number; sy: number; vx: number; vy: number; moved: boolean; pts: Map<number, { x: number; y: number }>; pinch?: number } | null>(null);

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
    if (tool === "pan") return onStageDown(e);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = { kind: "node", id: nid, sx: e.clientX, sy: e.clientY, vx: 0, vy: 0, moved: false, pts: new Map() };
  };

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
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
    if (g.kind === "pan") {
      if (!g.moved) {
        setSelected(null);
        setLinkFrom(null);
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
    const before = structuredClone(board);
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
      }
      if (e.key === "v") setTool("select");
      if (e.key === "h") setTool("pan");
      if (e.key === "c") setTool("connect");
      if (e.key === "f") fit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const play = (nid?: string) => {
    if (!videos.length) return;
    setPlayer(Math.max(0, videos.findIndex((v) => v.id === nid)));
  };

  /* ───── edges ───── */
  const edgePaths = board.edges.flatMap((e) => {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) return [];
    const pa = pos(a), pb = pos(b), sa = sizeOf(a), sb = sizeOf(b);
    let s: [number, number], d: [number, number], path: string;
    if (pb.x >= pa.x + sa.w * 0.6) {
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
    return [{ e, s, d, path, hot: selected === e.from || selected === e.to }];
  });

  const sel = selected ? byId.get(selected) : undefined;
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
                {edgePaths.map(({ e, s, d, path, hot }) => (
                  <g key={e.id} className="text-foreground" opacity={hot ? 0.9 : 0.45}>
                    <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5 / Math.max(view.z, 0.6)} strokeDasharray="1 6" strokeLinecap="round" />
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
              {nodes.map((n) => {
                const p = pos(n);
                return (
                  <div
                    key={n.id}
                    data-node={n.id}
                    ref={measure}
                    className={cn("absolute", tool === "select" && "cursor-grab active:cursor-grabbing", linkFrom === n.id && "outline-2 outline-dashed outline-offset-8")}
                    style={{ left: p.x, top: p.y, zIndex: drag?.id === n.id ? 5 : selected === n.id ? 4 : 1, outlineColor: accent }}
                    onPointerDown={(e) => onNodeDown(e, n.id)}
                    onDoubleClick={() => n.kind === "video" && play(n.id)}
                  >
                    <NodeCard
                      node={n}
                      accent={accent}
                      selected={selected === n.id}
                      childCount={childCount(n.id)}
                      onPlay={(vid) => (tool === "select" ? play(vid) : undefined)}
                      onToggleItem={(i) => patchNode(n.id, { items: (n.items ?? []).map((it, j) => (j === i ? { ...it, done: !it.done } : it)) })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <MoodView board={board} onPlay={play} onSelect={(nid) => { setSelected(nid); setPanel(true); }} />
        )}

        {/* Top-left: board name */}
        <div className="absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1 border border-border bg-card/90 p-1 pr-3 backdrop-blur sm:top-4 sm:left-4">
          <Button asChild variant="ghost" size="icon-sm" aria-label={t("nav.back")}>
            <Link to="/boards">
              <ArrowLeft />
            </Link>
          </Button>
          <span className="grid size-8 shrink-0 place-items-center text-white" style={{ background: accent }}>
            <Network className="size-4" />
          </span>
          <input
            value={board.title}
            onChange={(e) =>
              commit((b) => {
                b.title = e.target.value;
                const idea = b.nodes.find((n) => n.kind === "idea");
                if (idea && (idea.title === board.title || !idea.title)) idea.title = e.target.value;
              })
            }
            className="min-w-0 bg-transparent px-1 text-sm font-medium outline-none"
            style={{ width: `${Math.max(6, board.title.length + 1)}ch` }}
            aria-label={t("board.field.title")}
          />
          <span className="label-xs ml-1 hidden items-center gap-1.5 text-muted-foreground sm:flex">
            <span className="size-1.5 animate-pulse" style={{ background: accent }} /> {t("board.live")}
          </span>
        </div>

        {/* Top-right: view + connect */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 sm:top-4 sm:right-4">
          <div className="flex border border-border bg-card/90 p-0.5 backdrop-blur">
            {(["map", "mood"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn("label-xs flex h-8 items-center gap-1.5 px-2.5", mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {m === "map" ? <Workflow className="size-3.5" /> : <LayoutGrid className="size-3.5" />}
                <span className="hidden sm:inline">{m === "map" ? t("board.map") : t("board.moodboard")}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => setConnectOpen(true)} className="h-9">
            <Cable /> <span className="hidden sm:inline">{t("board.connect")}</span>
          </Button>
          <Button variant="outline" size="icon" className="size-9 bg-card/90" onClick={() => setPanel((p) => !p)} aria-label={t("board.panel")}>
            <PanelRight />
          </Button>
        </div>

        {/* Bottom toolbar */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 border border-border bg-card/95 p-1 shadow-[0_18px_40px_-20px_rgb(0_0_0/0.4)] backdrop-blur pb-safe sm:pb-1">
          {mode === "map" &&
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
              <button type="button" title={t("board.tool.tidy")} aria-label={t("board.tool.tidy")} onClick={tidy} className="grid size-10 place-items-center hover:bg-accent">
                <Sparkles className="size-4" />
              </button>
              <span className="mx-1 h-6 border-l border-border" />
            </>
          )}
          {videos.length > 0 && (
            <button type="button" title={t("board.watchAll")} onClick={() => play()} className="label-xs flex h-10 items-center gap-2 px-3 hover:bg-accent">
              <span className="relative size-5 overflow-hidden bg-[#111]">{videoPoster(videos[0]!) && <img src={videoPoster(videos[0]!)!} alt="" className="size-full object-cover" />}</span>
              {videos.length}
            </button>
          )}
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
          {sel ? (
            <Inspector key={sel.id} node={sel} onChange={(p) => patchNode(sel.id, p)} onDelete={() => deleteNode(sel.id)} onDone={() => setSelected(null)} />
          ) : (
            <Overview
              board={board}
              onPlay={play}
              onSelect={(nid) => {
                setSelected(nid);
                const n = byId.get(nid);
                const el = stage.current;
                if (n && el) setView((v) => ({ ...v, x: el.clientWidth / 2 - ((n.x ?? 0) + NODE_W[n.kind] / 2) * v.z, y: el.clientHeight / 2 - ((n.y ?? 0) + 100) * v.z }));
              }}
            />
          )}
        </aside>
      )}

      {player !== null && videos.length > 0 && <ReelPlayer videos={videos} start={player} stageOf={stageOf} onClose={() => setPlayer(null)} />}

      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}

/** Moodboard: one column per funnel stage, point to point, with everything that hangs under it. */
function MoodView({ board, onPlay, onSelect }: { board: Board; onPlay: (id: string) => void; onSelect: (id: string) => void }) {
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
    const poster = videoPoster(n);
    return (
      <button type="button" onClick={() => onPlay(n.id)} className="group relative block aspect-[9/16] w-full overflow-hidden bg-[#111] text-left text-white">
        {poster && <img src={poster} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <span className="label-xs absolute top-2 left-2 bg-black/50 px-1.5 text-[10px]">{parseVideo(n.video)?.provider ?? "video"}</span>
        <p className="absolute inset-x-3 bottom-3 text-sm font-medium">{n.title}</p>
      </button>
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
