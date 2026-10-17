import { useState } from "react";
import { cn } from "@/lib/utils";

export function SlideImage({ src, className, children }: { src?: string; className?: string; children?: React.ReactNode }) {
  const [failed, setFailed] = useState<string | null>(null);
  const ok = src && failed !== src;
  return (
    <div className={cn("xs-img", className)} data-empty={ok ? undefined : ""}>
      {ok && <img src={src} alt="" loading="lazy" draggable={false} onError={() => setFailed(src)} />}
      {children}
    </div>
  );
}
