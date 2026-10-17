import { ChevronLeft, ChevronRight, Loader2, Maximize, Minimize, Moon, Radio, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LangSwitch } from "@/components/lang-switch";
import { LogoMark } from "@/components/logo";
import { FontSizeControl } from "@/components/prefs-controls";
import { BarDivider, ControlBar, Stage } from "@/components/stage";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { useSync, type SyncMessage } from "@/lib/sync";
import type { Locale } from "@/lib/types";
import { useRemoteDeck } from "@/lib/use-remote-deck";
import { canFullscreen, toggleFullscreen, useFullscreenState } from "@/lib/app-mode";
import { useSlideNav } from "@/lib/use-slide-nav";
import { cn } from "@/lib/utils";

/** Audience view: follows the presenter live, in the reader's own language and text size. */
export default function Viewer() {
  const { id } = useParams();
  const { t, locale, fontScale, resolvedTheme, toggleTheme } = usePrefs();
  const { deck, loading } = useRemoteDeck(id);
  const [follow, setFollow] = useState(true);
  const [live, setLive] = useState<{ index: number; lang: Locale } | null>(null);
  const [own, setOwn] = useState(0);
  const [myLang, setMyLang] = useState<Locale | null>(null);
  const [bar, setBar] = useState(true);

  const onMessage = useCallback((m: SyncMessage) => {
    if (m.t === "state") setLive({ index: m.index, lang: m.lang });
  }, []);
  const { status } = useSync(id, "viewer", onMessage);

  const total = deck?.slides.length ?? 0;
  const following = follow && live != null;
  const index = Math.min(total - 1, Math.max(0, following ? live.index : own));
  const lang: Locale =
    myLang ?? live?.lang ?? (deck?.languages.includes(locale) ? locale : deck?.defaultLanguage) ?? "en";

  const step = (d: number) => {
    setFollow(false);
    setOwn(Math.max(0, Math.min(total - 1, index + d)));
  };
  useSlideNav({ onNext: () => step(1), onPrev: () => step(-1), onKey: (k) => k === "f" && toggleFullscreen() });
  const fs = useFullscreenState();

  // The bar gets out of the way after a few seconds; a tap brings it back.
  useEffect(() => {
    if (!bar) return;
    const id = setTimeout(() => setBar(false), 4500);
    return () => clearTimeout(id);
  }, [bar, index]);

  if (loading) return <Loader2 className="mx-auto mt-[40vh] size-6 animate-spin text-muted-foreground" />;
  if (!deck) return <p className="grid min-h-dvh place-items-center p-6 text-center text-muted-foreground">{t("view.notFound")}</p>;

  return (
    <Stage deck={deck} index={index} lang={lang} scale={fontScale} onTap={() => setBar((b) => !b)}>
      <ControlBar open={bar}>
        <span className="hidden px-2 sm:block">
          <LogoMark className="size-6" />
        </span>
        <Button
          variant={following ? "default" : "ghost"}
          size="sm"
          className="h-10"
          onClick={() => {
            setFollow(true);
            if (live) setOwn(live.index);
          }}
          disabled={!live}
          title={t("view.follow")}
        >
          <span className="relative">
            <Radio className={cn(following && "animate-pulse")} />
            <span
              className={cn("absolute -top-0.5 -right-0.5 size-1.5", status === "live" ? "bg-current" : "bg-muted-foreground/50")}
              title={status === "live" ? t("present.live") : t("present.offline")}
            />
          </span>
          <span className="hidden min-[420px]:inline">{following ? t("view.following") : t("view.follow")}</span>
        </Button>
        <BarDivider />
        <Button variant="ghost" size="icon" onClick={() => step(-1)} disabled={index === 0} aria-label={t("present.prev")}>
          <ChevronLeft />
        </Button>
        <span className="min-w-12 text-center text-xs tabular-nums">
          {String(index + 1).padStart(2, "0")}<span className="text-muted-foreground">/{String(total).padStart(2, "0")}</span>
        </span>
        <Button variant="ghost" size="icon" onClick={() => step(1)} disabled={index >= total - 1} aria-label={t("present.next")}>
          <ChevronRight />
        </Button>
        <BarDivider />
        <LangSwitch languages={deck.languages} value={lang} onChange={setMyLang} label={t("present.language")} />
        <FontSizeControl compact className="border-0" />
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t("present.theme")} className="hidden min-[420px]:inline-flex">
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}
        </Button>
        {canFullscreen() && (
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label={t("present.fullscreen")}>
            {fs ? <Minimize /> : <Maximize />}
          </Button>
        )}
      </ControlBar>
    </Stage>
  );
}
