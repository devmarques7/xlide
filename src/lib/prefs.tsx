import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { translate, type TKey } from "./i18n";
import { LOCALES, type Locale } from "./types";

export type ThemePref = "light" | "dark" | "system";
export const FONT_SCALES = [0.85, 1, 1.15, 1.3, 1.45, 1.6] as const;

interface Prefs {
  theme: ThemePref;
  locale: Locale;
  fontScale: number;
}

interface PrefsCtx extends Prefs {
  resolvedTheme: "light" | "dark";
  setTheme: (t: ThemePref) => void;
  toggleTheme: () => void;
  setLocale: (l: Locale) => void;
  setFontScale: (n: number) => void;
  bumpFont: (dir: 1 | -1) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const KEY = "xlide.prefs";

function detectLocale(): Locale {
  const nav = (navigator.language || "en").slice(0, 2) as Locale;
  return LOCALES.includes(nav) ? nav : "en";
}

function load(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      theme: raw.theme ?? "system",
      locale: LOCALES.includes(raw.locale) ? raw.locale : detectLocale(),
      fontScale: typeof raw.fontScale === "number" ? raw.fontScale : 1,
    };
  } catch {
    return { theme: "system", locale: detectLocale(), fontScale: 1 };
  }
}

function resolvedThemeOf(theme: ThemePref, systemDark: boolean): "light" | "dark" {
  return theme === "system" ? (systemDark ? "dark" : "light") : theme;
}

const Ctx = createContext<PrefsCtx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);
  // A host page may pin the theme with data-theme on <html>; otherwise follow the OS.
  const hostTheme = document.documentElement.dataset.theme;
  const [systemDark, setSystemDark] = useState(() =>
    hostTheme ? hostTheme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const root = document.documentElement;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const read = () => setSystemDark(root.dataset.theme ? root.dataset.theme === "dark" : mq.matches);
    mq.addEventListener("change", read);
    // Hosts that embed the app can switch theme by setting data-theme on <html>.
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", read);
      obs.disconnect();
    };
  }, []);

  const resolvedTheme = resolvedThemeOf(prefs.theme, systemDark);

  // Cross-fade colours for a moment whenever the effective theme changes.
  const firstTheme = useRef(true);
  useLayoutEffect(() => {
    if (firstTheme.current) {
      firstTheme.current = false;
      return;
    }
    const root = document.documentElement;
    root.classList.add("theme-switching");
    const t = setTimeout(() => root.classList.remove("theme-switching"), 300);
    return () => clearTimeout(t);
  }, [resolvedTheme]);


  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable */
    }
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.setProperty("--fs-scale", String(prefs.fontScale));
    root.lang = prefs.locale === "pt" ? "pt-BR" : prefs.locale;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) =>
      m.setAttribute("content", resolvedTheme === "dark" ? "#121211" : "#F1F0EC"),
    );
  }, [prefs, resolvedTheme]);

  const bumpFont = useCallback((dir: 1 | -1) => {
    setPrefs((p) => {
      const i = FONT_SCALES.findIndex((s) => s >= p.fontScale - 0.001);
      const next = FONT_SCALES[Math.min(FONT_SCALES.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir))];
      return { ...p, fontScale: next };
    });
  }, []);

  const value = useMemo<PrefsCtx>(
    () => ({
      ...prefs,
      resolvedTheme,
      setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
      toggleTheme: () => setPrefs((p) => ({ ...p, theme: resolvedTheme === "dark" ? "light" : "dark" })),
      setLocale: (locale) => setPrefs((p) => ({ ...p, locale })),
      setFontScale: (fontScale) => setPrefs((p) => ({ ...p, fontScale })),
      bumpFont,
      t: (key, vars) => translate(prefs.locale, key, vars),
    }),
    [prefs, resolvedTheme, bumpFont],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrefs outside PrefsProvider");
  return ctx;
}
