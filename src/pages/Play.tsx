import { ChevronLeft, ChevronRight, CircleDot, Maximize, Minimize, Minus, Pause, Play as PlayIcon, Plus, Square, Video, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BarDivider, ControlBar } from "@/components/stage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canFullscreen, toggleFullscreen, useFullscreenState, useImmersive } from "@/lib/app-mode";
import { usePrefs } from "@/lib/prefs";
import { isBuiltin, restoreBuiltin, updatePresentation, usePresentation } from "@/lib/store";
import type { Locale, Presentation, Slide } from "@/lib/types";
import { cn } from "@/lib/utils";
import { clock, loadYouTube, youtubeId, YT_STATE, type YTPlayer } from "@/lib/youtube";
import { DeckLook } from "@/slides/look";
import { BackdropLayer } from "@/slides/lyrics";
import { SlideView } from "@/slides/SlideView";

/** Last slide whose time has come; the first slide until then. */
function slideAt(slides: Slide[], t: number) {
  let found = 0;
  slides.forEach((s, i) => {
    if (s.at != null && s.at <= t) found = i;
  });
  return found;
}

export default function Play() {
  const { id } = useParams();
  const deck = usePresentation(id);
  const { t } = usePrefs();
  useEffect(() => {
    if (!deck && id) restoreBuiltin(id);
  }, [deck, id]);
  if (!deck && id && isBuiltin(id)) return null;
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
  return <Player deck={deck} />;
}

/**
 * Plays the deck's YouTube song and shows each slide at its time over the chosen
 * background. "Record timings" lets anyone sync a deck by tapping along once.
 */
function Player({ deck }: { deck: Presentation }) {
  useImmersive();
  const { t, locale, fontScale } = usePrefs();
  const navigate = useNavigate();
  const fs = useFullscreenState();
  const lang: Locale = deck.languages.includes(locale) ? locale : deck.defaultLanguage;
  const slides = deck.slides;
  const video = deck.music?.video;
  const offset = deck.music?.offset ?? 0;
  const timed = slides.some((s, i) => i > 0 && s.at != null);

  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [bar, setBar] = useState(true);
  const [link, setLink] = useState("");

  const save = useCallback((fn: (p: Presentation) => Presentation) => updatePresentation(deck.id, fn), [deck.id]);

  // One YouTube player per song; it is the sound (and, if chosen, the background).
  useEffect(() => {
    if (!video || !host.current) return;
    let dead = false;
    let p: YTPlayer | null = null;
    const el = document.createElement("div");
    host.current.replaceChildren(el);
    setReady(false);
    setFailed(false);
    loadYouTube()
      .then((YT) => {
        if (dead) return;
        p = new YT.Player(el, {
          videoId: video,
          width: "100%",
          height: "100%",
          playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, disablekb: 1, iv_load_policy: 3, fs: 0 },
          events: {
            onReady: (e) => {
              player.current = e.target;
              setDuration(e.target.getDuration());
              setReady(true);
            },
            onStateChange: (e) => {
              setPlaying(e.data === YT_STATE.PLAYING);
              if (e.data === YT_STATE.PLAYING) setDuration(e.target.getDuration());
              if (e.data === YT_STATE.ENDED) {
                setRecording(false);
                setIndex(slides.length - 1);
              }
            },
            onError: () => setFailed(true),
          },
        });
      })
      .catch(() => setFailed(true));
    return () => {
      dead = true;
      p?.destroy();
      player.current = null;
    };
    // The slide count only matters when the song ends; a new player is not needed for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video]);

  // The clock: while playing, follow the song (four ticks a second is plenty for text).
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const now = player.current?.getCurrentTime() ?? 0;
      setTime(Math.floor(now * 4) / 4);
      if (timed && !recording) setIndex(slideAt(slides, now + offset));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [playing, timed, recording, offset, slides]);

  // The bar hides itself while the song plays.
  useEffect(() => {
    if (!bar || !playing) return;
    const id = setTimeout(() => setBar(false), 3500);
    return () => clearTimeout(id);
  }, [bar, playing, time]);

  const toggle = () => {
    const p = player.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else {
      p.playVideo();
      setStarted(true);
    }
  };

  const seek = (sec: number) => {
    player.current?.seekTo(Math.max(0, sec), true);
    setTime(sec);
    if (timed && !recording) setIndex(slideAt(slides, sec + offset));
  };

  /** Next/previous slide: with timings, jump the song there; without, just turn the page. */
  const step = (dir: 1 | -1) => {
    const i = Math.max(0, Math.min(slides.length - 1, index + dir));
    const at = slides[i].at;
    if (timed && at != null) seek(Math.max(0, at - offset));
    else setIndex(i);
  };

  const startRecording = () => {
    const p = player.current;
    if (!p) return;
    // Old timings go; the first slide is on screen from the start.
    save((d) => ({ ...d, slides: d.slides.map((s, i) => ({ ...s, at: i === 0 ? 0 : undefined })) }));
    setIndex(0);
    setRecording(true);
    p.seekTo(0, true);
    p.playVideo();
    setStarted(true);
  };

  const stopRecording = () => {
    setRecording(false);
    toast.success(t("play.saved"));
  };

  /** While recording: the next slide starts now. */
  const mark = () => {
    const i = index + 1;
    if (i >= slides.length) return stopRecording();
    const now = Math.round((player.current?.getCurrentTime() ?? 0) * 100) / 100;
    const sid = slides[i].id;
    save((d) => ({ ...d, slides: d.slides.map((s) => (s.id === sid ? { ...s, at: now } : s)) }));
    setIndex(i);
    if (i === slides.length - 1) stopRecording();
  };

  const nudge = (d: number) => save((p) => ({ ...p, music: p.music && { ...p.music, offset: Math.round(((p.music.offset ?? 0) + d) * 100) / 100 } }));

  const setSong = () => {
    const vid = youtubeId(link);
    if (!vid) return toast.error(t("music.err.bad_url"));
    save((p) => ({ ...p, music: { video: vid } }));
    setLink("");
  };

  // Keys: Space plays (or marks while recording), arrows turn slides, F fullscreen, Esc leaves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        if (recording) mark();
        else if (e.key === " ") toggle();
        else step(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        if (!recording) step(-1);
      } else if (e.key === "f") toggleFullscreen();
      else if (e.key === "Escape") {
        if (recording) stopRecording();
        else if (!document.fullscreenElement) navigate(`/p/${deck.id}`);
      }
      setBar(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const slide = slides[index];
  const lyrics = slide?.layout === "lyrics";
  // The song's own video as background: show the player itself instead of a second, silent copy.
  const songIsBg = !!video && youtubeId(slide?.bg) === video;

  return (
    <div className="fixed inset-0 h-dvh overflow-hidden bg-black select-none">
      {lyrics && !songIsBg && <BackdropLayer bg={slide.bg} />}

      <div
        ref={host}
        aria-hidden={!showVideo && !songIsBg}
        className={cn("play-yt", songIsBg ? "is-bg" : showVideo ? "is-pip" : "is-hidden")}
      />

      <div
        className="absolute inset-0"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a,button,input")) return;
          if (recording) mark();
          else setBar((b) => !b);
        }}
      >
        {slide && (
          <div key={`${slide.id}-${lang}`} className={cn("absolute inset-0 animate-[fade-in_0.5s_ease_both]", lyrics && "xs-over")}>
            <DeckLook deck={deck} lang={lang}>
              <SlideView slide={slide} lang={lang} fallback={deck.defaultLanguage} live scale={fontScale} />
            </DeckLook>
          </div>
        )}
      </div>

      {/* No song yet: ask for its YouTube link. */}
      {!video && (
        <div className="absolute inset-x-4 top-1/2 z-30 mx-auto max-w-md -translate-y-1/2 border border-border bg-popover/95 p-5 text-popover-foreground backdrop-blur">
          <p className="mb-3 text-sm">{t("play.noMusic")}</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSong();
            }}
          >
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
            <Button type="submit" disabled={!link.trim()}>
              {t("play.useSong")}
            </Button>
          </form>
        </div>
      )}

      {/* Big start button before the first play. */}
      {video && ready && !started && !failed && (
        <button
          type="button"
          onClick={toggle}
          className="absolute top-1/2 left-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 border border-white/40 bg-black/50 px-7 py-4 text-white backdrop-blur hover:bg-black/70"
        >
          <PlayIcon className="size-6" />
          <span className="label-xs text-sm">{t("play.start")}</span>
        </button>
      )}

      {/* Messages above the bar. */}
      <div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex flex-col items-center gap-2 text-center">
        {failed && <p className="pointer-events-auto bg-black/70 px-3 py-2 text-sm text-white">{t("play.failed")}</p>}
        {recording && (
          <p className="bg-black/70 px-3 py-2 text-sm text-white">
            <CircleDot className="mr-1.5 inline size-4 animate-pulse text-red-500" />
            {t("play.recording", { n: index + 1, total: slides.length })}
          </p>
        )}
        {video && !timed && !recording && !failed && bar && <p className="bg-black/70 px-3 py-2 text-sm text-white">{t("play.noTimes")}</p>}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-0.5 bg-white/10">
        <div className="h-full bg-white/70" style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} />
      </div>

      <ControlBar open={bar || !started || recording}>
        <Button variant="ghost" size="icon" onClick={() => navigate(`/p/${deck.id}`)} aria-label={t("present.exit")} title={t("present.exit")}>
          <X />
        </Button>
        <BarDivider />
        <Button variant="ghost" size="icon" onClick={() => step(-1)} disabled={recording || index === 0} aria-label={t("present.prev")}>
          <ChevronLeft />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggle} disabled={!ready} aria-label={playing ? t("play.pause") : t("play.start")}>
          {playing ? <Pause /> : <PlayIcon />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => (recording ? mark() : step(1))} disabled={index >= slides.length - 1} aria-label={t("present.next")}>
          <ChevronRight />
        </Button>
        <span className="min-w-24 text-center text-xs tabular-nums">
          {clock(time)}
          <span className="text-muted-foreground"> / {clock(duration)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.5}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          disabled={!ready || recording}
          aria-label={t("play.position")}
          className="hidden w-40 accent-foreground md:block"
        />
        <BarDivider />
        {/* Offset: + shows the words earlier, − later. */}
        <Button variant="ghost" size="icon" onClick={() => nudge(-0.25)} disabled={!timed} aria-label={t("play.later")} title={t("play.later")}>
          <Minus />
        </Button>
        <span className="min-w-12 text-center text-xs tabular-nums" title={t("play.offset")}>
          {offset > 0 ? "+" : ""}
          {offset.toFixed(2)}s
        </span>
        <Button variant="ghost" size="icon" onClick={() => nudge(0.25)} disabled={!timed} aria-label={t("play.earlier")} title={t("play.earlier")}>
          <Plus />
        </Button>
        <BarDivider />
        <Button
          variant="ghost"
          size="sm"
          onClick={recording ? stopRecording : startRecording}
          disabled={!ready}
          className={cn(recording && "bg-accent")}
          title={t("play.recordHint")}
        >
          {recording ? <Square /> : <CircleDot />} <span className="hidden sm:inline">{recording ? t("play.stop") : t("play.record")}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowVideo((v) => !v)}
          disabled={!video || songIsBg}
          aria-pressed={showVideo}
          aria-label={t("play.video")}
          title={t("play.video")}
          className={cn(showVideo && "bg-accent")}
        >
          <Video />
        </Button>
        {video && (
          <Button variant="ghost" size="sm" onClick={() => save((p) => ({ ...p, music: undefined }))} title={t("play.changeSong")}>
            <span className="text-xs">{t("play.changeSong")}</span>
          </Button>
        )}
        {canFullscreen() && (
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label={t("present.fullscreen")}>
            {fs ? <Minimize /> : <Maximize />}
          </Button>
        )}
      </ControlBar>
    </div>
  );
}
