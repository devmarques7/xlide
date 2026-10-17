import { LOCALE_SHORT } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Segmented language control for a deck's own languages. */
export function LangSwitch({ languages, value, onChange, label, className }: { languages: Locale[]; value: Locale; onChange: (l: Locale) => void; label: string; className?: string }) {
  if (languages.length < 2) return null;
  return (
    <div className={cn("flex shrink-0 gap-0.5 rounded-lg bg-muted p-0.5", className)} role="radiogroup" aria-label={label}>
      {languages.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={value === l}
          onClick={() => onChange(l)}
          className={cn(
            "h-9 min-w-9 rounded-md px-2 text-xs font-semibold transition-colors",
            value === l ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LOCALE_SHORT[l]}
        </button>
      ))}
    </div>
  );
}
