import { useId } from "react";
import { cn } from "@/lib/utils";

/* XLIDE mark: a six-armed asterisk with flared tips, split by an S-shaped cut.
   Drawn on a 100-unit grid; arms are one shape rotated 0°, 60° and −60°. */
const ARM = "M42.5 15 L57.5 15 L55 50 L57.5 85 L42.5 85 L45 50 Z";
const CUTS = ["45,35.5 92,46 92,52", "55,64.5 8,54 8,48"];

/** The glyph alone. Uses currentColor, so it follows the theme automatically. */
export function LogoGlyph({ className, title }: { className?: string; title?: string }) {
  const id = `xm${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 100 100" className={cn("size-8", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <mask id={id}>
          <g fill="#fff" stroke="#fff" strokeWidth="8" strokeLinejoin="round">
            <path d={ARM} />
            <path d={ARM} transform="rotate(60 50 50)" />
            <path d={ARM} transform="rotate(-60 50 50)" />
          </g>
          <g fill="#000">
            {CUTS.map((p) => (
              <polygon key={p} points={p} />
            ))}
          </g>
        </mask>
      </defs>
      <rect width="100" height="100" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

/**
 * App icon: the glyph on a square tile. Ink tile with paper glyph by default;
 * `inverted` swaps them. Both come from theme tokens, so dark mode flips it.
 */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-grid size-8 shrink-0 place-items-center",
        inverted ? "bg-background text-foreground" : "bg-foreground text-background",
        className,
      )}
      aria-hidden
    >
      <LogoGlyph className="size-[72%]" />
    </span>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7" />
      {!compact && <span className="text-[0.95rem] font-semibold tracking-[0.18em]">XLIDE</span>}
    </span>
  );
}
