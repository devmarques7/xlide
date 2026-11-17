import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { parseVideo } from "../../../shared/board.js";

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
export function InlineVideo({ url, poster, className }: { url?: string; poster?: string | null; className?: string }) {
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
