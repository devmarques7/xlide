import {
  ArrowRight, BarChart3, Check, CheckSquare, File, FileText, Film, Image as ImageIcon, Lightbulb, Link2, PenTool, Play, StickyNote, Target, type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { InlineVideo } from "./inline-video";
import { NODE_W, parseVideo } from "../../../shared/board.js";
import type { BoardNode, NodeKind } from "@/lib/boards";
import { cn } from "@/lib/utils";

export const KIND_ICON: Record<NodeKind, LucideIcon> = {
  idea: Lightbulb,
  stage: Target,
  note: StickyNote,
  media: ImageIcon,
  video: Film,
  asset: File,
  list: CheckSquare,
  metric: BarChart3,
};

export function assetIcon(type?: string): LucideIcon {
  const t = (type ?? "").toLowerCase();
  if (t.includes("pdf") || t.includes("doc")) return FileText;
  if (t.includes("figma") || t.includes("design")) return PenTool;
  if (t.includes("jpg") || t.includes("png") || t.includes("image")) return ImageIcon;
  if (t.includes("video") || t.includes("mp4")) return Film;
  return Link2;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Cover of a video card: the given poster, the provider's thumbnail, or none. */
export function videoPoster(n: BoardNode) {
  return n.poster || parseVideo(n.video)?.poster || null;
}

interface CardProps {
  node: BoardNode;
  accent: string;
  selected: boolean;
  childCount: number;
  onPlay: (id: string) => void;
  onToggleItem: (i: number) => void;
  /** Writing inside the card (double-click). */
  editing?: boolean;
  onEdit?: (patch: Partial<BoardNode>) => void;
  onDone?: () => void;
  /** Live size while the corner is dragged. */
  size?: { w: number; h: number };
}

/** Textareas grow with what is typed (CSS field-sizing), so nothing is hidden while writing. */
const grow = { fieldSizing: "content" } as CSSProperties;

export function NodeCard({ node: n, accent, selected, childCount, onPlay, onToggleItem, editing, onEdit, onDone, size }: CardProps) {
  const w = size?.w ?? n.w ?? NODE_W[n.kind];
  const minH = size?.h ?? n.h;
  const shell = "relative flex-1 border border-border bg-card text-card-foreground shadow-[0_1px_0_rgb(0_0_0/0.03),0_18px_40px_-24px_rgb(0_0_0/0.45)]";
  const ring = selected && "outline-2 outline-offset-4 outline-foreground";
  const style: CSSProperties = { width: w, minHeight: minH, ["--accent" as string]: accent };

  if (editing && onEdit) {
    const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };
    const keys = (e: React.KeyboardEvent) => {
      if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        // Keep the key from the board's shortcuts (Escape would also drop the selection).
        e.stopPropagation();
        onDone?.();
      }
    };
    return (
      <div style={style} className="relative flex flex-col">
        <div className={cn(shell, "flex flex-col gap-2 p-4 outline-2 outline-offset-4")} style={{ outlineColor: accent }} {...stop}>
          <textarea
            autoFocus
            rows={1}
            defaultValue={n.title}
            onChange={(e) => onEdit({ title: e.target.value })}
            onKeyDown={keys}
            className="w-full resize-none bg-transparent text-lg leading-tight font-medium break-words outline-none"
            style={grow}
          />
          {n.kind === "list" ? (
            <textarea
              rows={3}
              defaultValue={(n.items ?? []).map((i) => (i.done ? `[x] ${i.text}` : i.text)).join("\n")}
              onChange={(e) => onEdit({ items: e.target.value.split("\n").filter((l) => l.trim()).map((l) => (/^\[x\]\s*/i.test(l) ? { text: l.replace(/^\[x\]\s*/i, ""), done: true } : { text: l })) })}
              onKeyDown={keys}
              className="w-full resize-none bg-transparent text-sm leading-6 outline-none"
              style={grow}
            />
          ) : (
            <textarea
              rows={2}
              defaultValue={n.text ?? ""}
              onChange={(e) => onEdit({ text: e.target.value || undefined })}
              onKeyDown={keys}
              placeholder="…"
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-muted-foreground outline-none"
              style={grow}
            />
          )}
          {n.kind === "metric" && (
            <input defaultValue={n.value ?? ""} onChange={(e) => onEdit({ value: e.target.value })} onKeyDown={keys} className="bg-transparent text-3xl font-medium outline-none" />
          )}
          <button type="button" onClick={onDone} className="label-xs self-end text-muted-foreground hover:text-foreground">
            ⌘↵ · Esc
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={style} className="relative flex flex-col">
      {n.by && (
        <span
          title={n.by}
          className="label-xs absolute top-0 -left-11 grid size-8 place-items-center bg-foreground text-[10px] text-background"
        >
          {initials(n.by)}
        </span>
      )}
      {n.kind === "idea" && (
        <div className={cn(shell, ring, "border-foreground bg-foreground p-6 text-background")}>
          <div className="flex items-center justify-between">
            <span className="label-xs opacity-60">Idea</span>
            <Lightbulb className="size-4 opacity-60" />
          </div>
          <h3 className="mt-6 text-3xl leading-[0.95] font-medium tracking-tight uppercase">{n.title}</h3>
          {n.text && <p className="mt-4 text-sm opacity-75">{n.text}</p>}
          <Tags node={n} dark />
        </div>
      )}

      {n.kind === "stage" && (
        <div className={cn(shell, ring, "p-5")}>
          <div className="flex items-start justify-between">
            <span className="font-mono text-4xl leading-none tracking-tight" style={{ color: accent }}>
              {String(n.step ?? "·").padStart(2, "0")}
            </span>
            <span className="label-xs text-muted-foreground">{childCount}</span>
          </div>
          <h3 className="mt-5 text-lg leading-tight font-medium uppercase">{n.title}</h3>
          {n.text && <p className="mt-1.5 text-sm text-muted-foreground">{n.text}</p>}
          {n.progress !== undefined && (
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1 flex-1 bg-muted">
                <div className="h-full" style={{ width: `${n.progress}%`, background: accent }} />
              </div>
              <span className="label-xs text-muted-foreground">{n.progress}%</span>
            </div>
          )}
          <Tags node={n} />
        </div>
      )}

      {n.kind === "note" && (
        <div className={cn(shell, ring, "bg-muted p-5")}>
          <div className="flex items-center justify-between">
            <span className="label-xs text-muted-foreground">Note</span>
            <StickyNote className="size-4 text-muted-foreground" />
          </div>
          <h3 className="mt-3 font-medium">{n.title}</h3>
          {n.text && <p className="mt-1.5 text-sm break-words whitespace-pre-line text-muted-foreground">{n.text}</p>}
          {n.url && (
            <a
              href={n.url}
              target="_blank"
              rel="noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              className="mt-4 flex items-center justify-between border border-border bg-card py-1.5 pr-1.5 pl-3 text-xs"
            >
              <span className="break-words">{n.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
              <span className="grid size-6 shrink-0 place-items-center bg-foreground text-background">
                <ArrowRight className="size-3.5" />
              </span>
            </a>
          )}
          <Tags node={n} />
        </div>
      )}

      {n.kind === "media" && (
        <div className={cn(ring)}>
          <div className="relative h-56">
            {(n.images?.length ? n.images.slice(0, 3) : [null]).map((src, i, arr) => {
              const fromTop = arr.length - 1 - i;
              return (
                <div
                  key={i}
                  className="absolute inset-0 overflow-hidden border border-border bg-muted shadow-[0_18px_40px_-20px_rgb(0_0_0/0.5)]"
                  style={{ transform: `translate(${fromTop * 22}px, ${-fromTop * 14}px) rotate(${fromTop ? (fromTop % 2 ? 3 : -3) : 0}deg) scale(${1 - fromTop * 0.06})`, zIndex: i }}
                >
                  {src ? (
                    <img src={src} alt="" draggable={false} className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground">
                      <ImageIcon className="size-6" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-medium">{n.title}</h3>
            {n.text && <p className="text-xs text-muted-foreground">{n.text}</p>}
          </div>
        </div>
      )}

      {n.kind === "video" && <VideoCard node={n} ring={!!selected} onPlay={onPlay} />}

      {n.kind === "asset" && (
        <div className={cn(shell, ring, "p-2")}>
          <div
            className="grid aspect-[4/3] place-items-center"
            style={{ background: (n.file_type ?? "").toLowerCase().includes("pdf") ? accent : "var(--foreground)" }}
          >
            {(() => {
              const Icon = assetIcon(n.file_type);
              return (
                <div className="flex flex-col items-center gap-2 text-white">
                  <Icon className="size-8" strokeWidth={1.5} />
                  {n.file_type && <span className="label-xs bg-black/25 px-1.5 text-[10px]">{n.file_type}</span>}
                </div>
              );
            })()}
          </div>
          <div className="px-1 pt-2 pb-1 text-center">
            <h3 className="break-words text-sm font-medium">{n.title}</h3>
            <p className="break-words text-xs text-muted-foreground">{n.subtitle ?? n.url?.replace(/^https?:\/\/(www\.)?/, "") ?? ""}</p>
          </div>
        </div>
      )}

      {n.kind === "list" && (
        <div className={cn(shell, ring)}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-medium">{n.title}</h3>
            <span className="label-xs text-muted-foreground">
              {n.items?.filter((i) => i.done).length ?? 0}/{n.items?.length ?? 0}
            </span>
          </div>
          <ul className="p-1.5">
            {(n.items ?? []).slice(0, 8).map((it, i) => (
              <li key={i}>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onToggleItem(i)}
                  className="flex w-full items-center gap-3 px-2.5 py-2 text-left text-sm hover:bg-accent"
                >
                  <span
                    className={cn("grid size-5 shrink-0 place-items-center border", it.done ? "border-transparent text-white" : "border-border")}
                    style={it.done ? { background: accent } : undefined}
                  >
                    {it.done && <Check className="size-3" />}
                  </span>
                  <span className={cn("flex-1 break-words", it.done && "text-muted-foreground line-through")}>{it.text}</span>
                  {it.by && <span className="label-xs text-muted-foreground">{initials(it.by)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {n.kind === "metric" && (
        <div className={cn(shell, ring, "p-5")}>
          <span className="label-xs text-muted-foreground">{n.title}</span>
          <p className="mt-3 text-4xl leading-none font-medium tracking-tight">{n.value ?? "—"}</p>
          {n.text && <p className="mt-2 text-xs text-muted-foreground">{n.text}</p>}
        </div>
      )}
    </div>
  );
}

function VideoCard({ node: n, ring, onPlay }: { node: BoardNode; ring: boolean; onPlay: (id: string) => void }) {
  const info = parseVideo(n.video);
  const poster = videoPoster(n);
  return (
    <div className={cn(ring && "outline-2 outline-offset-4 outline-foreground")}>
      <div className="group relative block aspect-[9/16] w-full overflow-hidden border border-border bg-[#111] text-left text-white shadow-[0_18px_40px_-20px_rgb(0_0_0/0.55)]">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_30%_10%,#3a3a38,#0d0d0c)]" />
        <InlineVideo url={n.video} poster={poster} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
        <span className="label-xs absolute top-3 left-3 bg-black/45 px-1.5 text-[10px] backdrop-blur">{info?.provider ?? "video"}</span>
        <button
          type="button"
          aria-label="Play"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onPlay(n.id)}
          className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center bg-white/90 text-black transition-transform group-hover:scale-110"
        >
          <Play className="size-6 fill-current" />
        </button>
        <div className="absolute inset-x-3 bottom-3">
          <p className="line-clamp-2 text-sm leading-tight font-medium">{n.title}</p>
          {n.text && <p className="mt-1 line-clamp-2 text-xs opacity-70">{n.text}</p>}
        </div>
      </div>
    </div>
  );
}

function Tags({ node, dark }: { node: BoardNode; dark?: boolean }) {
  const tags = [node.tag, ...(node.tags ?? [])].filter(Boolean) as string[];
  if (!tags.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {tags.map((t, i) => (
        <span
          key={t + i}
          className={cn("label-xs px-1.5 py-0.5 text-[10px]", i === 0 ? "text-white" : dark ? "bg-background/15" : "bg-muted")}
          style={i === 0 ? { background: "var(--accent)" } : undefined}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
