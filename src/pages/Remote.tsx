import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { LangSwitch } from "@/components/lang-switch";
import { Logo } from "@/components/logo";
import { PinPad } from "@/components/pin-pad";
import { FontSizeControl, ThemeToggle } from "@/components/prefs-controls";
import { isUnlocked, unlock } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { useSync, type SyncMessage } from "@/lib/sync";
import { tx, type Locale } from "@/lib/types";
import { useRemoteDeck } from "@/lib/use-remote-deck";
import { cn } from "@/lib/utils";
import { SlideFrame } from "@/slides/SlideView";

export default function Remote() {
  const { t } = usePrefs();
  const [unlocked, setUnlocked] = useState(isUnlocked);
  if (!unlocked) {
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between p-4">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-10">
          <p className="label-xs mb-8 text-center text-muted-foreground">{t("remote.unlock")}</p>
          <PinPad onSubmit={(c) => {
            const ok = unlock(c);
            if (ok) setTimeout(() => setUnlocked(true), 300);
            return ok;
          }} />
        </div>
      </div>
    );
  }
  return <RemoteControl />;
}

function RemoteControl() {
  const { id } = useParams();
  const { t } = usePrefs();
  const { deck, loading } = useRemoteDeck(id);
  const [state, setState] = useState<{ index: number; lang: Locale; total: number } | null>(null);

  const onMessage = useCallback((m: SyncMessage) => {
    if (m.t === "state") setState({ index: m.index, lang: m.lang, total: m.total });
  }, []);
  const { status, presence, send } = useSync(id, "remote", onMessage);

  const cmd = (action: "next" | "prev") => {
    navigator.vibrate?.(12);
    send({ t: "cmd", action });
    // Optimistic update so the remote feels instant.
    setState((s) => (s ? { ...s, index: Math.max(0, Math.min(s.total - 1, s.index + (action === "next" ? 1 : -1))) } : s));
  };

  const online = state != null && (presence.presenter > 0 || status === "local");
  const lang = state?.lang ?? deck?.defaultLanguage ?? "en";
  const i = state?.index ?? 0;
  const slide = deck?.slides[i];
  const next = deck?.slides[i + 1];
  const note = tx(slide?.notes, lang, deck?.defaultLanguage);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Logo compact />
        <div className="min-w-0 flex-1">
          <p className="label-xs text-muted-foreground">{t("remote.title")}</p>
          <p className="truncate text-sm font-medium uppercase tracking-tight">{deck ? tx(deck.title, lang, deck.defaultLanguage) : "—"}</p>
        </div>
        <span className={cn("label-xs inline-flex items-center gap-1.5", online ? "text-foreground" : "text-muted-foreground")}>
          <span className={cn("size-2 rounded-full", online ? "bg-foreground" : "animate-pulse bg-foreground/30")} />
          {online ? t("remote.connected") : t("remote.waiting")}
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        {loading ? (
          <Loader2 className="mx-auto mt-20 size-6 animate-spin text-muted-foreground" />
        ) : deck && slide ? (
          <>
            <div className="flex items-end justify-between">
              <span className="display text-6xl tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="label-xs pb-1 text-muted-foreground">
                {t("common.of")} {String(deck.slides.length).padStart(2, "0")}
              </span>
            </div>
            <SlideFrame slide={slide} lang={lang} fallback={deck.defaultLanguage} />
            <section className="rounded-xl border border-border p-4">
              <p className="label-xs mb-2 text-muted-foreground">{t("remote.notes")}</p>
              <p className="text-base leading-relaxed whitespace-pre-line">{note || <span className="text-muted-foreground">{t("remote.noNotes")}</span>}</p>
            </section>
            <section className="flex items-center gap-3">
              <div className="w-28 shrink-0">
                {next ? <SlideFrame slide={next} lang={lang} fallback={deck.defaultLanguage} /> : <div className="aspect-video rounded-lg border border-dashed border-border" />}
              </div>
              <div className="min-w-0">
                <p className="label-xs text-muted-foreground">{t("remote.nextUp")}</p>
                <p className="truncate text-sm">{next ? tx(next.title, lang, deck.defaultLanguage).replace(/\n/g, " ") || t(`layout.${next.layout}`) : t("remote.end")}</p>
              </div>
            </section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <LangSwitch languages={deck.languages} value={lang} onChange={(l) => send({ t: "cmd", action: "lang", lang: l })} label={t("present.language")} />
              <div className="flex items-center gap-1">
                <FontSizeControl compact />
                <ThemeToggle />
              </div>
            </div>
          </>
        ) : (
          <p className="mt-20 text-center text-muted-foreground">{t("view.notFound")}</p>
        )}
      </main>

      <footer className="sticky bottom-0 grid grid-cols-[1fr_1.6fr] gap-3 border-t border-border bg-background/95 p-4 pb-safe backdrop-blur">
        <button
          type="button"
          onClick={() => cmd("prev")}
          disabled={!deck || i === 0}
          className="flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-border text-sm font-medium transition-transform active:scale-[0.97] disabled:opacity-30"
        >
          <ChevronLeft className="size-7" strokeWidth={1.5} />
          {t("remote.prev")}
        </button>
        <button
          type="button"
          onClick={() => cmd("next")}
          disabled={!deck || i >= (deck?.slides.length ?? 1) - 1}
          className="flex h-24 flex-col items-center justify-center gap-1 rounded-2xl bg-primary text-sm font-medium text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-30"
        >
          <ChevronRight className="size-7" strokeWidth={1.5} />
          {t("remote.next")}
        </button>
      </footer>
    </div>
  );
}
