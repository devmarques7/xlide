import { useCallback, useEffect, useState } from "react";

type FsDoc = Document & { webkitFullscreenElement?: Element; webkitFullscreenEnabled?: boolean; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

const doc = document as FsDoc;

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isTouch = () => matchMedia("(pointer: coarse)").matches;

/** Running from the home screen / installed app (no browser UI). */
export function isStandalone() {
  return (
    matchMedia("(display-mode: fullscreen)").matches ||
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export const canFullscreen = () => !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
export const isFullscreen = () => !!(doc.fullscreenElement || doc.webkitFullscreenElement);

export function enterFullscreen() {
  const el = document.documentElement as FsEl;
  try {
    if (el.requestFullscreen) return el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    el.webkitRequestFullscreen?.();
  } catch {
    /* not allowed here */
  }
}

export function exitFullscreen() {
  if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
  else doc.webkitExitFullscreen?.();
}

export function toggleFullscreen() {
  if (isFullscreen()) exitFullscreen();
  else enterFullscreen();
}

export function useFullscreenState() {
  const [fs, setFs] = useState(isFullscreen);
  useEffect(() => {
    const on = () => setFs(isFullscreen());
    document.addEventListener("fullscreenchange", on);
    document.addEventListener("webkitfullscreenchange", on);
    return () => {
      document.removeEventListener("fullscreenchange", on);
      document.removeEventListener("webkitfullscreenchange", on);
    };
  }, []);
  return fs;
}

/**
 * Immersive slide view, like a native app:
 * - first tap on a touch device enters fullscreen (where the browser allows it),
 * - the screen stays awake while the presentation is open,
 * - the page itself never scrolls or bounces behind the slide.
 */
export function useImmersive() {
  useEffect(() => {
    const root = document.documentElement;
    // iPhone Safari has no fullscreen API for pages. Letting the page scroll a
    // little allows a swipe up to collapse Safari's bars instead.
    const mode = isIOS() && !canFullscreen() && !isStandalone() ? "immersive-ios" : "immersive";
    root.classList.add(mode);

    const first = () => {
      if (isTouch() && !isStandalone() && canFullscreen() && !isFullscreen()) enterFullscreen();
    };
    window.addEventListener("pointerup", first, { once: true });

    let lock: { release: () => Promise<void> } | null = null;
    const wake = async () => {
      try {
        if (document.visibilityState === "visible" && "wakeLock" in navigator) {
          lock = await (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen");
        }
      } catch {
        /* denied or unsupported */
      }
    };
    wake();
    document.addEventListener("visibilitychange", wake);

    return () => {
      root.classList.remove(mode);
      setBrowserTint(getComputedStyle(document.body).backgroundColor);
      window.removeEventListener("pointerup", first);
      document.removeEventListener("visibilitychange", wake);
      lock?.release().catch(() => {});
    };
  }, []);
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;
const installListeners = new Set<() => void>();
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as InstallEvent;
  installListeners.forEach((l) => l());
});

/** Android/desktop Chrome install prompt, when the browser offers one. */
export function useInstallPrompt() {
  const [available, setAvailable] = useState(!!deferred);
  useEffect(() => {
    const l = () => setAvailable(!!deferred);
    installListeners.add(l);
    return () => void installListeners.delete(l);
  }, []);
  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    deferred = null;
    setAvailable(false);
  }, []);
  return { available, install };
}

/** Tint the browser's own bars (Safari, Chrome on Android) with the slide colour. */
export function setBrowserTint(color: string) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
}
