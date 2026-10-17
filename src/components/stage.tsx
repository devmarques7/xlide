import { useEffect, useRef, type ReactNode } from "react";
import { InstallHint } from "@/components/install-hint";
import { setBrowserTint, useImmersive } from "@/lib/app-mode";
import type { Locale, Presentation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SlideView } from "@/slides/SlideView";

/** Full-viewport slide with a fade between pages and a hairline progress bar. */
export function Stage({
  deck,
  index,
  lang,
  scale,
  onTap,
  children,
}: {
  deck: Presentation;
  index: number;
  lang: Locale;
  scale: number;
  onTap?: () => void;
  children?: ReactNode;
}) {
  useImmersive();
  const root = useRef<HTMLDivElement>(null);
  const slide = deck.slides[index];

  // Browser bars take the colour of the current slide so they blend in.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = root.current?.querySelector(".xs");
      if (el) setBrowserTint(getComputedStyle(el).backgroundColor);
    });
    return () => cancelAnimationFrame(id);
  });
  const progress = deck.slides.length > 1 ? index / (deck.slides.length - 1) : 1;
  return (
    <div ref={root} className="fixed inset-0 h-dvh overflow-hidden bg-background select-none">
      <div
        className="absolute inset-0"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a,button")) return;
          onTap?.();
        }}
      >
        {slide && (
          <div key={`${slide.id}-${lang}`} className="absolute inset-0 animate-[fade-up_0.45s_cubic-bezier(0.2,0.7,0.2,1)_both]">
            <SlideView slide={slide} lang={lang} fallback={deck.defaultLanguage} live scale={scale} />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-foreground/10">
        <div className="h-full bg-foreground/70 transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
      </div>
      <InstallHint />
      {children}
    </div>
  );
}

export function ControlBar({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe transition-all duration-300",
        open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      )}
      aria-hidden={!open}
      style={{ paddingLeft: "max(0.75rem, env(safe-area-inset-left))", paddingRight: "max(0.75rem, env(safe-area-inset-right))" }}
    >
      <div
        className={cn(
          "flex max-w-full items-center gap-0.5 overflow-x-auto sm:gap-1 rounded-2xl border border-border bg-popover/90 p-1.5 text-popover-foreground shadow-2xl backdrop-blur-xl no-scrollbar",
          open && "pointer-events-auto",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function BarDivider() {
  return <span className="mx-1 hidden h-6 w-px shrink-0 bg-border sm:block" />;
}
