import { Maximize2, Play, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { parseVideo } from "../../../shared/board.js";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/* Autoplay preference, per person (on by default). */
const KEY = "xlide.autoplay";
const subs = new Set<() => void>();
let autoplayOn = (() => {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
})();
export function setAutoplay(on: boolean) {
  autoplayOn = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f());
}
export function useAutoplay() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => autoplayOn,
  );
}

/** Width the Instagram embed is laid out at, then scaled to the card. */
const IG_W = 328;

/**
 * A video playing inside its card: muted, looping, no controls, only while the
 * card is on screen (so a big board stays light). Shows the cover otherwise.
 * Pointer events pass through, so the card can still be dragged.
 */
export function InlineVideo({ url, poster, className, active = false }: { url?: string; poster?: string | null; className?: string; active?: boolean }) {
  const info = parseVideo(url);
  const on = useAutoplay();
  const box = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [w, setW] = useState(200);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    const ro = new ResizeObserver(() => setW(el.offsetWidth || 200));
    ro.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  const cover = poster || info?.poster;
  const live = on && inView && !!info;
  if (active && info) {
    // Playing inside the card: sound, controls and clicks go to the video.
    return (
      <div ref={box} className={className ?? "absolute inset-0 overflow-hidden"}>
        {info.provider === "file" ? (
          <video src={info.play} autoPlay controls loop playsInline className="absolute inset-0 size-full bg-black object-contain" />
        ) : info.provider === "instagram" ? (
          <iframe
            src={info.play}
            title="instagram"
            scrolling="no"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            className="absolute top-0 left-0 origin-top-left border-0 bg-white"
            style={{ width: IG_W, height: (IG_W * 16) / 9 + 120, transform: `scale(${w / IG_W})`, marginTop: -54 * (w / IG_W) }}
          />
        ) : (
          <iframe src={info.play} title="video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 size-full border-0 bg-black" />
        )}
      </div>
    );
  }
  return (
    <div ref={box} className={className ?? "absolute inset-0 overflow-hidden"}>
      {cover && <img src={cover} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />}
      {live && info.provider === "file" && (
        <video src={info.inline} autoPlay muted loop playsInline preload="auto" className="pointer-events-none absolute inset-0 size-full object-cover" />
      )}
      {live && (info.provider === "youtube" || info.provider === "tiktok") && (
        <iframe
          src={info.inline}
          title="video"
          allow="autoplay; encrypted-media; picture-in-picture"
          tabIndex={-1}
          className="pointer-events-none absolute top-1/2 left-1/2 border-0"
          // Cover the 9:16 card: a little larger than the box, centred.
          style={{ width: "100%", height: "100%", transform: "translate(-50%, -50%) scale(1.02)" }}
        />
      )}
      {live && info.provider === "instagram" && (
        <iframe
          src={info.inline}
          title="instagram"
          tabIndex={-1}
          scrolling="no"
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0 bg-white"
          style={{ width: IG_W, height: (IG_W * 16) / 9 + 120, transform: `scale(${w / IG_W})`, marginTop: -54 * (w / IG_W) }}
        />
      )}
    </div>
  );
}

/**
 * A 9:16 video card body: plays muted on its own (autoplay), ▶ plays it right
 * here with sound and controls, ⤢ (or a double click on the card) opens it full screen.
 * The label strip on top stays a handle for dragging the card.
 */
export function VideoTile({ url, poster, title, text, onExpand, className }: {
  url?: string;
  poster?: string | null;
  title?: string;
  text?: string;
  onExpand: () => void;
  className?: string;
}) {
  const { t } = usePrefs();
  const [active, setActive] = useState(false);
  const info = parseVideo(url);
  const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };
  return (
    <div className={cn("group relative overflow-hidden bg-[#111] text-left text-white", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_30%_10%,#3a3a38,#0d0d0c)]" />
      <InlineVideo url={url} poster={poster} active={active} className={cn("absolute inset-x-0 bottom-0 overflow-hidden", active ? "top-7" : "top-0")} />
      {!active && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />}
      {/* Top strip: provider, and the buttons. Dragging here moves the card even while the video plays. */}
      <div className={cn("absolute inset-x-0 top-0 flex h-7 items-center gap-1 pl-2", active && "bg-black")}>
        <span className="label-xs bg-black/45 px-1.5 text-[10px]">{info?.provider ?? "video"}</span>
        <span className="flex-1" />
        {active && (
          <button {...stop} type="button" onClick={() => setActive(false)} className="grid size-7 place-items-center hover:bg-white/15" title={t("video.stop")} aria-label={t("video.stop")}>
            <X className="size-3.5" />
          </button>
        )}
        <button {...stop} type="button" onClick={onExpand} className="grid size-7 place-items-center hover:bg-white/15" title={t("video.expand")} aria-label={t("video.expand")}>
          <Maximize2 className="size-3.5" />
        </button>
      </div>
      {!active && (
        <>
          <button
            {...stop}
            type="button"
            onClick={() => info && setActive(true)}
            className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center bg-white/90 text-black transition-transform group-hover:scale-110"
            title={t("video.playHere")}
            aria-label={t("video.playHere")}
          >
            <Play className="size-6 fill-current" />
          </button>
          {(title || text) && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3">
              {title && <p className="text-sm leading-tight font-medium break-words">{title}</p>}
              {text && <p className="mt-1 text-xs break-words opacity-70">{text}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
