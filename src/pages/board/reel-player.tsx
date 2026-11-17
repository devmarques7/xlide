import { ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { parseVideo } from "../../../shared/board.js";
import type { BoardNode } from "@/lib/boards";
import { usePrefs } from "@/lib/prefs";

/**
 * Full-screen vertical player, like Reels: one video per screen, swipe, wheel or
 * arrow keys to move. Starts playing on open where the provider allows it.
 */
export function ReelPlayer({ videos, start, index, onIndex, stageOf, onClose }: {
  videos: BoardNode[];
  start: number;
  /** Set while following someone: the player shows their video. */
  index?: number;
  /** Reports the video on screen (the host shares it with followers). */
  onIndex?: (i: number) => void;
  stageOf: (id: string) => string | undefined;
  onClose: () => void;
}) {
  const { t } = usePrefs();
  const [i, setI] = useState(Math.max(0, Math.min(start, videos.length - 1)));
  const root = useRef<HTMLDivElement>(null);
  const touchY = useRef<number | null>(null);
  const wheelLock = useRef(0);
  const go = (d: number) => setI((x) => Math.max(0, Math.min(videos.length - 1, x + d)));
  useEffect(() => {
    if (index !== undefined) setI(Math.max(0, Math.min(videos.length - 1, index)));
  }, [index, videos.length]);
  const report = useRef(onIndex);
  report.current = onIndex;
  useEffect(() => {
    report.current?.(i);
  }, [i]);

  useEffect(() => {
    root.current?.requestFullscreen?.().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "j") go(1);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "k") go(-1);
    };
    const onFs = () => {
      if (!document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const n = videos[i];
  const info = n ? parseVideo(n.video) : null;

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black text-white"
      style={{ animation: "fade-in 0.2s ease both" }}
      onWheel={(e) => {
        const now = Date.now();
        if (Math.abs(e.deltaY) < 30 || now - wheelLock.current < 600) return;
        wheelLock.current = now;
        go(e.deltaY > 0 ? 1 : -1);
      }}
      onTouchStart={(e) => (touchY.current = e.touches[0]!.clientY)}
      onTouchEnd={(e) => {
        if (touchY.current === null) return;
        const dy = e.changedTouches[0]!.clientY - touchY.current;
        touchY.current = null;
        if (Math.abs(dy) > 60) go(dy < 0 ? 1 : -1);
      }}
    >
      {/* Blurred backdrop from the cover */}
      {n?.poster || info?.poster ? (
        <img src={n?.poster || info?.poster || ""} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-3xl" />
      ) : null}

      <div key={n?.id} className="relative h-dvh max-h-dvh w-[min(100vw,calc(100dvh*9/16))] bg-black">
        {!info ? (
          <p className="grid h-full place-items-center p-8 text-center text-sm opacity-70">{t("board.noVideo")}</p>
        ) : info.provider === "file" ? (
          <video src={info.embed} autoPlay playsInline loop controls className="size-full object-contain" />
        ) : (
          <iframe
            src={info.embed}
            title={n?.title}
            className="size-full border-0 bg-black"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
            allowFullScreen
            scrolling="no"
          />
        )}
      </div>

      {/* Caption */}
      <div className="pointer-events-none absolute bottom-0 left-0 max-w-sm p-5 pb-safe sm:p-8">
        {n && stageOf(n.id) && <p className="label-xs opacity-60">{stageOf(n.id)}</p>}
        <p className="mt-1 text-xl leading-tight font-medium">{n?.title}</p>
        {n?.text && <p className="mt-2 line-clamp-4 text-sm opacity-70">{n.text}</p>}
        {info?.provider === "instagram" && <p className="mt-3 text-xs opacity-50">{t("board.igHint")}</p>}
      </div>

      {/* Controls */}
      <div className="absolute top-0 right-0 flex items-center gap-1 p-3 sm:p-5">
        <span className="label-xs mr-2 opacity-60">
          {i + 1} / {videos.length}
        </span>
        {info && (
          <a href={info.url} target="_blank" rel="noreferrer" className="grid size-10 place-items-center bg-white/10 hover:bg-white/20" title={t("board.openOriginal")}>
            <ExternalLink className="size-4" />
          </a>
        )}
        <button type="button" onClick={onClose} className="grid size-10 place-items-center bg-white/10 hover:bg-white/20" aria-label={t("common.close")}>
          <X className="size-5" />
        </button>
      </div>
      <div className="absolute top-1/2 right-3 flex -translate-y-1/2 flex-col gap-1 sm:right-5">
        <button type="button" disabled={i === 0} onClick={() => go(-1)} className="grid size-11 place-items-center bg-white/10 hover:bg-white/20 disabled:opacity-25" aria-label={t("board.prev")}>
          <ChevronUp className="size-5" />
        </button>
        <button type="button" disabled={i === videos.length - 1} onClick={() => go(1)} className="grid size-11 place-items-center bg-white/10 hover:bg-white/20 disabled:opacity-25" aria-label={t("board.next")}>
          <ChevronDown className="size-5" />
        </button>
      </div>
    </div>
  );
}
