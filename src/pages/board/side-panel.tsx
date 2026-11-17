import { Check, Film, Play, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { outline, parseVideo } from "../../../shared/board.js";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Board, BoardNode } from "@/lib/boards";
import { cn } from "@/lib/utils";
import { uploadImage } from "@/lib/images";
import { usePrefs } from "@/lib/prefs";
import { KIND_ICON, videoPoster } from "./cards";

/** Board overview: the idea, the funnel point to point, reels and the image moodboard. */
export function Overview({ board, onSelect, onPlay }: { board: Board; onSelect: (id: string) => void; onPlay: (id?: string) => void }) {
  const { t } = usePrefs();
  const o = outline(board);
  const videos = board.nodes.filter((n) => n.kind === "video");
  const images = board.nodes.flatMap((n) => (n.kind === "media" ? (n.images ?? []).map((src) => ({ src, id: n.id })) : []));
  return (
    <div className="space-y-6 p-5">
      <section className="bg-foreground p-5 text-background">
        <p className="label-xs opacity-60">{t("board.kind.idea")}</p>
        <h2 className="mt-3 text-2xl leading-[0.95] font-medium tracking-tight uppercase">{board.title}</h2>
        {board.idea && <p className="mt-3 text-sm opacity-75">{board.idea}</p>}
        <div className="label-xs mt-5 flex flex-wrap gap-x-3 gap-y-1 opacity-60">
          <span>{t("board.cards", { n: board.nodes.length })}</span>
          <span>{t("board.stages", { n: o.stages.length })}</span>
          <span>{t("board.reels", { n: videos.length })}</span>
        </div>
      </section>

      {board.summary && (
        <section>
          <p className="label-xs text-muted-foreground">{t("board.strategy")}</p>
          <p className="mt-2 text-sm whitespace-pre-line">{board.summary}</p>
        </section>
      )}

      {o.stages.length > 0 && (
        <section>
          <p className="label-xs text-muted-foreground">{t("board.funnel")}</p>
          <ol className="mt-3">
            {o.stages.map(({ stage, items }, i) => (
              <li key={stage.id} className="relative pb-5 pl-10 last:pb-0">
                {i < o.stages.length - 1 && <span className="absolute top-8 bottom-0 left-[15px] border-l border-dashed border-border" />}
                <span
                  className="absolute top-0 left-0 grid size-8 place-items-center font-mono text-xs text-white"
                  style={{ background: board.accent, opacity: 1 - (i / Math.max(1, o.stages.length)) * 0.45 }}
                >
                  {String(stage.step ?? i + 1).padStart(2, "0")}
                </span>
                <button type="button" onClick={() => onSelect(stage.id)} className="text-left">
                  <span className="block leading-tight font-medium uppercase hover:underline">{stage.title}</span>
                  {stage.text && <span className="mt-0.5 block text-xs text-muted-foreground">{stage.text}</span>}
                </button>
                {items.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {items.map((n) => {
                      const Icon = KIND_ICON[n.kind];
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => (n.kind === "video" ? onPlay(n.id) : onSelect(n.id))}
                            className="flex w-full items-center gap-2 py-0.5 text-left text-sm text-muted-foreground hover:text-foreground"
                          >
                            <Icon className="size-3.5 shrink-0" />
                            <span className="truncate">{n.kind === "metric" && n.value ? `${n.value} · ${n.title}` : n.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {videos.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <p className="label-xs text-muted-foreground">{t("board.reels", { n: videos.length })}</p>
            <Button size="sm" variant="outline" onClick={() => onPlay()}>
              <Play /> {t("board.watchAll")}
            </Button>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {videos.map((v) => {
              const poster = videoPoster(v);
              return (
                <button key={v.id} type="button" onClick={() => onPlay(v.id)} className="relative aspect-[9/16] w-20 shrink-0 overflow-hidden bg-[#111] text-white" title={v.title}>
                  {poster ? <img src={poster} alt="" className="size-full object-cover" /> : <Film className="absolute top-1/2 left-1/2 size-5 -translate-1/2 opacity-60" />}
                  <span className="label-xs absolute inset-x-1 bottom-1 truncate text-[9px]">{parseVideo(v.video)?.provider}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {images.length > 0 && (
        <section>
          <p className="label-xs text-muted-foreground">{t("board.moodboard")}</p>
          <div className="mt-3 grid grid-cols-3 gap-1">
            {images.slice(0, 18).map((im, i) => (
              <button key={im.src + i} type="button" onClick={() => onSelect(im.id)} className="aspect-square overflow-hidden bg-muted">
                <img src={im.src} alt="" className="size-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Edits one card. Every change is saved as you type. */
export function Inspector({ node: n, onChange, onDelete, onDone }: {
  node: BoardNode;
  onChange: (patch: Partial<BoardNode>) => void;
  onDelete: () => void;
  onDone: () => void;
}) {
  const { t } = usePrefs();
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const Icon = KIND_ICON[n.kind];
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  const field = (label: string, el: React.ReactNode) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {el}
    </div>
  );

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <p className="label-xs flex-1">{t(`board.kind.${n.kind}`)}</p>
        <Button size="sm" variant="ghost" onClick={onDone}>
          {t("board.done")}
        </Button>
      </div>

      {field(t("board.field.title"), <Input value={n.title} onChange={(e) => onChange({ title: e.target.value })} autoFocus={!n.title} />)}

      {n.kind === "video" && (
        <>
          {field(
            t("board.field.video"),
            <Input value={n.video ?? ""} placeholder="https://www.instagram.com/reel/…" onChange={(e) => onChange({ video: e.target.value })} />,
          )}
          {n.video && !parseVideo(n.video) && <p className="text-xs text-destructive">instagram.com/reel/… · youtube.com/shorts/… · tiktok.com/…/video/… · .mp4</p>}
          {field(t("board.field.poster"), <Input value={n.poster ?? ""} onChange={(e) => onChange({ poster: e.target.value || undefined })} />)}
        </>
      )}

      {n.kind === "metric" && field(t("board.field.value"), <Input value={n.value ?? ""} onChange={(e) => onChange({ value: e.target.value })} />)}

      {n.kind !== "list" && field(t("board.field.text"), <Textarea rows={4} value={n.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} />)}

      {n.kind === "stage" && (
        <div className="grid grid-cols-2 gap-3">
          {field(t("board.field.step"), <Input type="number" min={1} value={n.step ?? ""} onChange={(e) => onChange({ step: e.target.value ? Number(e.target.value) : undefined })} />)}
          {field(
            t("board.field.progress"),
            <Input type="number" min={0} max={100} value={n.progress ?? ""} onChange={(e) => onChange({ progress: e.target.value ? Math.max(0, Math.min(100, Number(e.target.value))) : undefined })} />,
          )}
        </div>
      )}

      {n.kind === "media" && (
        <>
          {field(
            t("board.field.images"),
            <Textarea rows={4} value={(n.images ?? []).join("\n")} onChange={(e) => onChange({ images: lines(e.target.value) })} className="font-mono text-xs" />,
          )}
          <input
            ref={file}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              if (!files.length) return;
              setUploading(true);
              const urls: string[] = [];
              for (const f of files) urls.push((await uploadImage(f)).url);
              setUploading(false);
              onChange({ images: [...(n.images ?? []), ...urls] });
            }}
          />
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => file.current?.click()}>
            <Upload /> {t("board.upload")}
          </Button>
        </>
      )}

      {n.kind === "list" &&
        field(
          t("board.field.items"),
          <Textarea
            rows={6}
            value={(n.items ?? []).map((i) => (i.done ? `[x] ${i.text}` : i.text)).join("\n")}
            onChange={(e) =>
              onChange({ items: e.target.value.split("\n").filter((l) => l.trim()).map((l) => (/^\[x\]\s*/i.test(l) ? { text: l.replace(/^\[x\]\s*/i, ""), done: true } : { text: l })) })
            }
          />,
        )}

      {(n.kind === "asset" || n.kind === "note") && field(t("board.field.url"), <Input value={n.url ?? ""} onChange={(e) => onChange({ url: e.target.value || undefined })} />)}
      {n.kind === "asset" && field(t("board.field.fileType"), <Input value={n.file_type ?? ""} onChange={(e) => onChange({ file_type: e.target.value || undefined })} />)}

      <div className="grid grid-cols-2 gap-3">
        {field(t("board.field.tag"), <Input value={n.tag ?? ""} onChange={(e) => onChange({ tag: e.target.value || undefined })} />)}
        {field(t("board.field.by"), <Input value={n.by ?? ""} onChange={(e) => onChange({ by: e.target.value || undefined })} />)}
      </div>

      {n.kind !== "idea" && (
        <Button variant="outline" className="w-full" onClick={onDelete}>
          <Trash2 /> {t("board.deleteCard")}
        </Button>
      )}
    </div>
  );
}

/**
 * Moodboard sidebar: the mind map cards, by stage. Drag one onto the board to
 * make a moodboard card from it (or tap +). Cards already placed are marked.
 */
export function MapPalette({ board, placed }: { board: Board; placed: Set<string> }) {
  const { t } = usePrefs();
  const o = outline(board);
  const idea = board.nodes.find((n) => n.kind === "idea");
  const groups = [
    ...(idea ? [{ key: "idea", head: null as BoardNode | null, items: [idea] }] : []),
    ...o.stages.map((s) => ({ key: s.stage.id, head: s.stage, items: [s.stage, ...s.items] })),
    ...(o.loose.filter((n) => n.kind !== "idea").length ? [{ key: "loose", head: null, items: o.loose.filter((n) => n.kind !== "idea") }] : []),
  ];
  const waiting = board.nodes.filter((n) => !placed.has(n.id)).length;
  return (
    <div className="p-5">
      <p className="label-xs text-muted-foreground">{t("mood.palette")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("mood.paletteHint", { n: waiting })}</p>
      <div className="mt-4 space-y-4">
        {groups.map((g) => (
          <section key={g.key}>
            {g.head && <p className="label-xs mb-1 truncate" style={{ color: board.accent }}>{String(g.head.step ?? "").padStart(2, "0")} · {g.head.title}</p>}
            <ul className="space-y-1">
              {g.items.map((n) => {
                const Icon = KIND_ICON[n.kind];
                const done = placed.has(n.id);
                return (
                  <li
                    key={n.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-xlide-node", n.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className={cn("group flex cursor-grab items-center gap-2 border border-border bg-background px-2.5 py-2 text-sm active:cursor-grabbing hover:border-foreground", done && "opacity-50")}
                    title={t("mood.dragHint")}
                  >
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 break-words">{n.title || t(`board.kind.${n.kind}`)}</span>
                    {done && <Check className="size-3.5 shrink-0" />}
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("xlide:mood-add-node", { detail: n.id }))}
                      className="grid size-6 shrink-0 place-items-center text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label={t("mood.add")}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
