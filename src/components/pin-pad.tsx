import { Delete } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

const KEYS: [string, string][] = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
];

/** iPhone-style passcode entry. `onSubmit` returns whether the code was accepted. */
export function PinPad({
  length = 4,
  onSubmit,
  onCancel,
  title,
  hint,
}: {
  length?: number;
  onSubmit: (code: string) => boolean;
  onCancel?: () => void;
  title?: string;
  hint?: string;
}) {
  const { t } = usePrefs();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [ok, setOk] = useState(false);

  const press = useCallback(
    (d: string) => {
      if (ok) return;
      setError(false);
      setCode((c) => {
        const next = (c + d).slice(0, length);
        if (next.length === length) {
          setTimeout(() => {
            if (onSubmit(next)) {
              setOk(true);
              navigator.vibrate?.(10);
            } else {
              setError(true);
              navigator.vibrate?.([40, 40, 40]);
              setTimeout(() => setCode(""), 450);
            }
          }, 120);
        }
        return next;
      });
    },
    [length, onSubmit, ok],
  );

  const back = useCallback(() => setCode((c) => c.slice(0, -1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back, onCancel]);

  return (
    <div className="flex w-full max-w-xs flex-col items-center select-none">
      <p className="text-lg font-medium tracking-tight">{ok ? t("login.unlocking") : title ?? t("login.enter")}</p>
      <div
        className={cn("mt-6 mb-3 flex gap-5", error && "animate-shake")}
        role="status"
        aria-label={`${code.length} / ${length}`}
      >
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border-[1.5px] border-foreground transition-colors duration-150",
              i < code.length && "bg-foreground",
            )}
          />
        ))}
      </div>
      <p className={cn("h-5 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
        {error ? t("login.wrong") : hint}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-x-6 gap-y-4 sm:gap-x-7">
        {KEYS.map(([d, letters]) => (
          <Key key={d} onClick={() => press(d)} digit={d} letters={letters} />
        ))}
        <button
          type="button"
          onClick={onCancel}
          className={cn("text-sm font-medium", !onCancel && "invisible")}
        >
          {t("login.cancel")}
        </button>
        <Key onClick={() => press("0")} digit="0" letters="+" />
        <button
          type="button"
          onClick={back}
          aria-label={t("login.delete")}
          className={cn(
            "grid place-items-center text-sm font-medium transition-opacity",
            code.length === 0 && "pointer-events-none opacity-0",
          )}
        >
          <Delete className="size-6" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function Key({ digit, letters, onClick }: { digit: string; letters: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-[4.6rem] flex-col items-center justify-center rounded-full bg-foreground/[0.07] transition-colors duration-75 active:bg-foreground/25 dark:bg-foreground/[0.1] sm:size-20"
    >
      <span className="text-[2rem] leading-none font-light">{digit}</span>
      <span className={cn("mt-0.5 text-[0.6rem] font-semibold tracking-[0.2em]", !letters && "invisible")}>{letters || "·"}</span>
    </button>
  );
}
