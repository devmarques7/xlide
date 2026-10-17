import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-border bg-card text-card-foreground", className)} {...props} />;
}

export function Separator({ className, vertical, ...props }: React.ComponentProps<"div"> & { vertical?: boolean }) {
  return <div role="separator" className={cn("shrink-0 bg-border", vertical ? "w-px self-stretch" : "h-px w-full", className)} {...props} />;
}
