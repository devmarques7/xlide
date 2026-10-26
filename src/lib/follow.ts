import { useEffect, useRef, useState } from "react";

/*
 * Follow a song by ear: the browser's speech recognition listens (microphone)
 * and the words it hears are matched against the next few slides. When the
 * singing matches a later slide better than the current one, the deck moves on.
 * Chrome, Edge and Safari have it; it needs the microphone and a connection.
 */

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

const Ctor = (): RecognitionCtor | undefined =>
  (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;

export const canFollow = () => typeof window !== "undefined" && !!Ctor();

export const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

/** Share of the heard words found in a slide's words, in order-insensitive form. */
function score(heard: string[], slide: Set<string>) {
  if (!heard.length || !slide.size) return 0;
  return heard.filter((w) => slide.has(w)).length / heard.length;
}

/** Recognition languages for the deck languages. */
const SPEECH_LANG: Record<string, string> = { pt: "pt-BR", en: "en-US", nl: "nl-NL" };

export type FollowState = "off" | "listening" | "denied" | "unsupported" | "error";

/**
 * Listens while `on` and calls `advance(i)` when the singing reaches slide i.
 * `texts` are the slides' words; `index` is the slide on screen.
 */
export function useVoiceFollow({
  on,
  lang,
  texts,
  index,
  advance,
}: {
  on: boolean;
  lang: string;
  texts: string[];
  index: number;
  advance: (i: number) => void;
}) {
  const [state, setState] = useState<FollowState>("off");
  const [heard, setHeard] = useState("");
  const live = useRef({ texts, index, advance });
  live.current = { texts, index, advance };
  const sets = useRef<Set<string>[]>([]);
  sets.current = texts.map((t) => new Set(words(t)));

  useEffect(() => {
    if (!on) {
      setState("off");
      return;
    }
    const R = Ctor();
    if (!R) {
      setState("unsupported");
      return;
    }
    let stopped = false;
    let buffer: string[] = [];
    let rec: Recognition | null = null;

    const start = () => {
      rec = new R();
      rec.lang = SPEECH_LANG[lang] ?? lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++) text += " " + e.results[i][0].transcript;
        const latest = words(text);
        if (!latest.length) return;
        setHeard(text.trim().split(/\s+/).slice(-8).join(" "));
        // The last few words heard, across results, are what is being sung now.
        buffer = [...buffer, ...latest].slice(-10);
        const recent = buffer.slice(-6);
        if (recent.length < 3) return;
        const { index: cur, advance: go } = live.current;
        const here = score(recent, sets.current[cur] ?? new Set());
        // Look a few slides ahead only, so a repeated chorus never jumps far.
        let best = -1;
        let bestScore = 0;
        for (let j = cur + 1; j <= Math.min(cur + 3, sets.current.length - 1); j++) {
          // Nearer slides win ties: they are the likelier next line.
          const s = score(recent, sets.current[j]) - (j - cur - 1) * 0.05;
          if (s > bestScore) {
            bestScore = s;
            best = j;
          }
        }
        if (best > 0 && bestScore >= 0.55 && bestScore > here + 0.15) {
          buffer = [];
          go(best);
        }
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          stopped = true;
          setState("denied");
        } else if (e.error !== "no-speech" && e.error !== "aborted") setState("error");
      };
      // Recognition stops by itself after silences: start again while following.
      rec.onend = () => {
        if (!stopped) setTimeout(() => !stopped && start(), 250);
      };
      try {
        rec.start();
        setState("listening");
      } catch {
        setState("error");
      }
    };
    start();
    return () => {
      stopped = true;
      rec?.abort();
    };
  }, [on, lang]);

  return { state, heard };
}
