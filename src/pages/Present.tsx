import {
  ChevronLeft, ChevronRight, Maximize, Minimize, Moon, NotebookText, QrCode, Smartphone, Sun, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { LangSwitch } from "@/components/lang-switch";
import { FontSizeControl } from "@/components/prefs-controls";
import { CopyField, LanHint, QrBlock, ShareDialog } from "@/components/share-dialog";
import { BarDivider, ControlBar, Stage } from "@/components/stage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePrefs } from "@/lib/prefs";
import { usePresentation } from "@/lib/store";
import { usePublicOrigin, useSync, type SyncMessage } from "@/lib/sync";
import { tx, type Locale } from "@/lib/types";
import { toggleFullscreen, useSlideNav } from "@/lib/use-slide-nav";
import { ACCESS_CODE, cn } from "@/lib/utils";

export default function Present() {
  const { id } = useParams();
  const deck = usePresentation(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, locale, fontScale, bumpFont, resolvedTheme, toggleTheme } = usePrefs();
  const { origin } = usePublicOrigin();

  const initialLang = (params.get("lang") as Locale) ?? (deck?.languages.includes(locale) ? locale : deck?.defaultLanguage);
  const [index, setIndex] = useState(() => Number(params.get("slide") ?? 0) || 0);
  const [lang, setLang] = useState<Locale>(initialLang ?? "en");
  const [bar, setBar] = useState(true);
  const [notes, setNotes] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [fs, setFs] = useState(false);
  const total = deck?.slides.length ?? 0;
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stateRef = useRef(() => {});
  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(total - 1, i))), [total]);

  const onMessage = useCallback(
    (m: SyncMessage) => {
      if (m.t === "cmd") {
        if (m.action === "next") setIndex((i) => Math.min(total - 1, i + 1));
        if (m.action === "prev") setIndex((i) => Math.max(0, i - 1));
        if (m.action === "goto" && m.index != null) go(m.index);
        if (m.action === "lang" && m.lang) setLang(m.lang);
      }
      if (m.t === "hello" && m.role !== "presenter") stateRef.current();
    },
    [go, total],
  );
  const { status, presence, send } = useSync(id, "presenter", onMessage);

  stateRef.current = () => send({ t: "state", index, lang, total });
  useEffect(() => {
    stateRef.current();
  }, [index, lang, total, status]);

  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // Bar fades out by itself after a while; a tap brings it back.
  useEffect(() => {
    clearTimeout(hideTimer.current);
    if (bar && !remoteOpen && !shareOpen) hideTimer.current = setTimeout(() => setBar(false), 5000);
    return () => clearTimeout(hideTimer.current);
  }, [bar, index, remoteOpen, shareOpen]);

  useSlideNav({
    onNext: () => go(index + 1),
    onPrev: () => go(index - 1),
    onFirst: () => go(0),
    onLast: () => go(total - 1),
    onEscape: () => (document.fullscreenElement ? null : navigate(`/p/${id}`)),
    onKey: (k) => {
      if (k === "f") toggleFullscreen();
      if (k === "n") setNotes((v) => !v);
      if (k === "+" || k === "=") bumpFont(1);
      if (k === "-") bumpFont(-1);
    },
    enabled: !remoteOpen && !shareOpen,
  });

  if (!deck) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center text-muted-foreground">
        <div>
          {t("editor.notFound")}
          <Button asChild variant="outline" className="mt-4 block">
            <Link to="/">{t("nav.back")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const slide = deck.slides[index];
  const note = tx(slide?.notes, lang, deck.defaultLanguage);
  const remoteUrl = `${origin}/remote/${deck.id}`;
  const connected = presence.remote + presence.viewer;

  return (
    <Stage deck={deck} index={index} lang={lang} scale={fontScale} onTap={() => setBar((b) => !b)}>
      {/* Notes */}
      {notes && (
        <div className="fixed top-3 right-3 left-3 z-30 ml-auto max-w-md animate-fade-up rounded-2xl border border-border bg-popover/95 p-4 shadow-xl backdrop-blur sm:top-5 sm:right-5 sm:left-auto">
          <div className="mb-2 flex items-center justify-between">
            <span className="label-xs text-muted-foreground">{t("present.notes")} · {String(index + 1).padStart(2, "0")}</span>
            <button onClick={() => setNotes(false)} className="text-muted-foreground hover:text-foreground" aria-label={t("common.close")}>
              <X className="size-4" />
            </button>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line">{note || t("remote.noNotes")}</p>
        </div>
      )}

      {/* Hint when bar hidden */}
      {!bar && index === 0 && (
        <p className="pointer-events-none fixed inset-x-0 bottom-5 z-30 text-center label-xs text-muted-foreground opacity-70">{t("present.tapHint")}</p>
      )}

      <ControlBar open={bar}>
        <Button variant="ghost" size="icon" onClick={() => navigate(`/p/${deck.id}`)} aria-label={t("present.exit")} title={t("present.exit")}>
          <X />
        </Button>
        <BarDivider />
        <Button variant="ghost" size="icon" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t("present.prev")}>
          <ChevronLeft />
        </Button>
        <span className="min-w-14 text-center text-xs tabular-nums">
          {String(index + 1).padStart(2, "0")}<span className="text-muted-foreground"> / {String(total).padStart(2, "0")}</span>
        </span>
        <Button variant="ghost" size="icon" onClick={() => go(index + 1)} disabled={index >= total - 1} aria-label={t("present.next")}>
          <ChevronRight />
        </Button>
        <BarDivider />
        <LangSwitch languages={deck.languages} value={lang} onChange={setLang} label={t("present.language")} />
        <FontSizeControl compact className="border-0" />
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t("present.theme")}>
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}
        </Button>
        <BarDivider />
        <Button variant="ghost" size="icon" onClick={() => setRemoteOpen(true)} aria-label={t("present.remote")} title={t("present.remote")} className="relative">
          <Smartphone />
          {presence.remote > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-foreground" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShareOpen(true)} aria-label={t("present.audience")} title={t("present.audience")}>
          <QrCode />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setNotes((v) => !v)} aria-label={t("present.notes")} aria-pressed={notes} className={cn(notes && "bg-accent")}>
          <NotebookText />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label={t("present.fullscreen")} className="hidden sm:inline-flex">
          {fs ? <Minimize /> : <Maximize />}
        </Button>
      </ControlBar>

      <Dialog open={remoteOpen} onOpenChange={setRemoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("present.remoteTitle")}</DialogTitle>
            <DialogDescription>{t("present.remoteDesc")}</DialogDescription>
          </DialogHeader>
          <QrBlock url={remoteUrl} />
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border text-center">
            <div className="border-r border-border p-3">
              <p className="label-xs text-muted-foreground">{t("present.code")}</p>
              <p className="mt-1 font-mono text-2xl tracking-[0.3em]">{ACCESS_CODE.replace(/./g, "•")}</p>
            </div>
            <div className="border-r border-border p-3">
              <p className="label-xs text-muted-foreground">{t("present.remotes")}</p>
              <p className="mt-1 text-2xl tabular-nums">{presence.remote}</p>
            </div>
            <div className="p-3">
              <p className="label-xs text-muted-foreground">{t("present.viewers")}</p>
              <p className="mt-1 text-2xl tabular-nums">{presence.viewer}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={status === "live" ? "default" : "outline"}>
              <span className={cn("size-1.5 rounded-full", status === "live" ? "bg-primary-foreground" : "bg-foreground/40")} />
              {status === "live" ? t("present.live") : t("present.offline")}
            </Badge>
            <span className="text-xs text-muted-foreground">{t("present.connected", { n: connected })}</span>
          </div>
          <CopyField value={remoteUrl} />
          <LanHint />
        </DialogContent>
      </Dialog>

      <ShareDialog id={deck.id} title={tx(deck.title, lang)} open={shareOpen} onOpenChange={setShareOpen} />
    </Stage>
  );
}
