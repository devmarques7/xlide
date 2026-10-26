import "@fontsource/bebas-neue/400.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LText, Slide } from "@/lib/types";
import { cn } from "@/lib/utils";
import { loopEmbed, thumbnail, youtubeId } from "@/lib/youtube";

/* Worship lyrics: words centred over a slow colour wash or a looping video. */

export interface Wash {
  id: string;
  name: string;
  base: string;
  /** Four glows, drifting. */
  c: [string, string, string, string];
  /** Light streak across the frame (the "lens" look), or none. */
  streak?: string;
  /** Text colour; light washes use dark ink. */
  ink?: string;
}

export const WASHES: Wash[] = [
  { id: "ember", name: "Ember", base: "#040302", c: ["#ff6a1a", "#c2410c", "#5b6b7a", "#1a0a05"], streak: "#ff8a3d" },
  { id: "amber", name: "Amber", base: "#2a0d02", c: ["#ffb020", "#ff6a00", "#c2280c", "#3a1004"] },
  { id: "crimson", name: "Crimson", base: "#2a0008", c: ["#ff1744", "#ff5a7a", "#b0003a", "#ff8a3d"] },
  { id: "dusk", name: "Dusk", base: "#050507", c: ["#ff4d1a", "#1e3a8a", "#7f1d1d", "#0b0b10"], streak: "#ff6a3d" },
  { id: "ocean", name: "Ocean", base: "#01131c", c: ["#00b4d8", "#0077b6", "#023e8a", "#00303f"] },
  { id: "midnight", name: "Midnight", base: "#020617", c: ["#1e40af", "#1d4ed8", "#0b1d4f", "#000000"], streak: "#3b82f6" },
  { id: "teal", name: "Teal", base: "#031a1e", c: ["#0e7490", "#22d3ee", "#134e4a", "#0f172a"] },
  { id: "mist", name: "Mist", base: "#8fb3ad", c: ["#e6f4f1", "#6fa8a0", "#bfe3dc", "#4d7c74"], ink: "#0f1f1c" },
  { id: "gold", name: "Gold", base: "#0d0a05", c: ["#f5c26b", "#a16207", "#3b2a12", "#000000"], streak: "#f5c26b" },
];

export const FONTS = [
  { id: "grotesk", name: "Grotesk", family: "var(--font-sans)" },
  { id: "serif", name: "Serif", family: '"Instrument Serif", Georgia, serif' },
  { id: "condensed", name: "Condensed", family: '"Bebas Neue", Impact, sans-serif' },
  { id: "mono", name: "Mono", family: "var(--font-mono)" },
] as const;

export const DEFAULT_BG = "wash:ember";
export const washOf = (bg?: string) => (bg?.startsWith("wash:") ? WASHES.find((w) => w.id === bg.slice(5)) : undefined);
const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|#|$)/i.test(url) || url.includes("videos.pexels.com");

/** Wash, looping video or still image filling the slide. */
export function Backdrop({ bg }: { bg?: string }) {
  const value = bg || DEFAULT_BG;
  const wash = washOf(value);
  if (wash) {
    return (
      <div
        className="xs-wash"
        aria-hidden
        style={{ "--w0": wash.base, "--w1": wash.c[0], "--w2": wash.c[1], "--w3": wash.c[2], "--w4": wash.c[3], "--ws": wash.streak ?? "transparent" } as CSSProperties}
      >
        <span />
        <span />
        <span />
        <span />
        {wash.streak && <i />}
      </div>
    );
  }
  const yt = youtubeId(value);
  if (yt) return <YouTubeLoop id={yt} />;
  if (isVideo(value)) return <LoopVideo src={value} />;
  return <img className="xs-wash-media" src={value} alt="" draggable={false} />;
}

/** Plays only where slides animate (presenting, big preview); thumbnails show a still frame. */
function LoopVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (v.closest("[data-animate]") && !v.closest(".xs-over")) v.play().catch(() => {});
    else v.pause();
  });
  return <video ref={ref} className="xs-wash-media" src={`${src}#t=0.5`} muted loop playsInline preload="metadata" aria-hidden />;
}

/**
 * A YouTube video as a silent looping background. Only where slides animate:
 * thumbnails (editor list, previews) show its poster instead of a player each.
 */
function YouTubeLoop({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  // Under a shared BackdropLayer (.xs-over) the slide's own copy is hidden: don't load it.
  useEffect(() => setLive(!!ref.current?.closest("[data-animate]") && !ref.current.closest(".xs-over")), []);
  return (
    <div ref={ref} className="xs-wash-media xs-yt" aria-hidden>
      {live ? (
        <iframe src={loopEmbed(id)} title="" allow="autoplay; encrypted-media" tabIndex={-1} />
      ) : (
        <img src={thumbnail(id)} alt="" draggable={false} />
      )}
    </div>
  );
}

/**
 * One background behind a run of lyrics slides. Rendered outside the slide
 * (which hides its own copy), so a video keeps playing as the words change.
 */
export function BackdropLayer({ bg, children }: { bg?: string; children?: ReactNode }) {
  return (
    <div className="xs absolute inset-0" data-animate="" data-tone="dark">
      <div className="xs-lyrics">
        <Backdrop key={bg || DEFAULT_BG} bg={bg} />
        <div className="xs-ly-grain" aria-hidden />
        {children}
      </div>
    </div>
  );
}

export function Lyrics({ s, T }: { s: Slide; T: (v: LText | undefined) => string }) {
  const wash = washOf(s.bg || DEFAULT_BG);
  const font = FONTS.find((f) => f.id === s.font) ?? FONTS[0];
  const lines = T(s.title).split("\n");
  return (
    <div className={cn("xs-lyrics", `font-${font.id}`)} style={{ "--ly-font": font.family, "--ly-ink": wash?.ink ?? "#f7f5f0" } as CSSProperties}>
      <Backdrop bg={s.bg} />
      <div className="xs-ly-grain" aria-hidden />
      <div className="xs-pad xs-ly-content">
        <span className="xs-label xs-ly-top">{T(s.eyebrow)}</span>
        <div className="xs-ly-words">
          <p className="xs-ly-lines" style={{ "--n": lines.length } as CSSProperties}>
            {lines.map((l, i) => (
              <span key={i}>{l || " "}</span>
            ))}
          </p>
          {T(s.subtitle) && (
            <p className="xs-ly-trans">
              {T(s.subtitle)
                .split("\n")
                .map((l, i) => (
                  <span key={i}>{l || " "}</span>
                ))}
            </p>
          )}
        </div>
        <span className="xs-label xs-ly-foot">{T(s.cta)}</span>
      </div>
    </div>
  );
}
