import { cn } from "@/lib/utils";

/** The XLIDE mark: a single X drawn with two square-capped strokes. */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden>
      <rect width="64" height="64" rx="14" className={inverted ? "fill-background" : "fill-foreground"} />
      <path
        d="M19 19 L45 45 M45 19 L19 45"
        className={inverted ? "stroke-foreground" : "stroke-background"}
        strokeWidth="5.5"
        strokeLinecap="square"
      />
    </svg>
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
