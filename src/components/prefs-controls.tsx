import { AArrowDown, AArrowUp, Check, Languages, Moon, Settings2, Sun, SunMoon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_SHORT } from "@/lib/i18n";
import { FONT_SCALES, usePrefs, type ThemePref } from "@/lib/prefs";
import { LOCALES, type Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FontSizeControl({ className, compact }: { className?: string; compact?: boolean }) {
  const { t, fontScale, bumpFont } = usePrefs();
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-border", className)} role="group" aria-label={t("prefs.textSize")}>
      <Button variant="ghost" size="icon-sm" onClick={() => bumpFont(-1)} disabled={fontScale <= FONT_SCALES[0]} aria-label={t("prefs.smaller")} title={t("prefs.smaller")}>
        <AArrowDown />
      </Button>
      {!compact && <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">{Math.round(fontScale * 100)}%</span>}
      <Button variant="ghost" size="icon-sm" onClick={() => bumpFont(1)} disabled={fontScale >= FONT_SCALES[FONT_SCALES.length - 1]} aria-label={t("prefs.larger")} title={t("prefs.larger")}>
        <AArrowUp />
      </Button>
    </div>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t, resolvedTheme, toggleTheme } = usePrefs();
  return (
    <Button variant="ghost" size="icon" className={className} onClick={toggleTheme} aria-label={t("prefs.theme")} title={t("prefs.theme")}>
      {resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}

export function LanguageMenu({ className }: { className?: string }) {
  const { t, locale, setLocale } = usePrefs();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("h-10 gap-1.5 px-2.5", className)} aria-label={t("prefs.language")}>
          <Languages />
          <span className="text-xs font-semibold tracking-wider">{LOCALE_SHORT[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("prefs.language")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          {LOCALES.map((l) => (
            <DropdownMenuRadioItem key={l} value={l}>
              <span className="w-6 text-xs font-semibold text-muted-foreground">{LOCALE_SHORT[l]}</span>
              {t(`lang.${l}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One menu with every preference — used on small screens. */
export function PrefsMenu() {
  const { t, locale, setLocale, theme, setTheme, fontScale, bumpFont, setFontScale } = usePrefs();
  const themes: { v: ThemePref; icon: typeof Sun; k: "prefs.light" | "prefs.dark" | "prefs.system" }[] = [
    { v: "light", icon: Sun, k: "prefs.light" },
    { v: "dark", icon: Moon, k: "prefs.dark" },
    { v: "system", icon: SunMoon, k: "prefs.system" },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("prefs.settings")}>
          <Settings2 />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{t("prefs.textSize")}</DropdownMenuLabel>
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <Button variant="outline" size="icon-sm" onClick={() => bumpFont(-1)} aria-label={t("prefs.smaller")}>
            <AArrowDown />
          </Button>
          <button className="text-sm tabular-nums" onClick={() => setFontScale(1)} title={t("prefs.reset")}>
            {Math.round(fontScale * 100)}%
          </button>
          <Button variant="outline" size="icon-sm" onClick={() => bumpFont(1)} aria-label={t("prefs.larger")}>
            <AArrowUp />
          </Button>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("prefs.theme")}</DropdownMenuLabel>
        {themes.map(({ v, icon: Icon, k }) => (
          <DropdownMenuItem key={v} onSelect={(e) => { e.preventDefault(); setTheme(v); }}>
            <Icon /> {t(k)}
            {theme === v && <Check className="ml-auto !text-foreground" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("prefs.language")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          {LOCALES.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} onSelect={(e) => e.preventDefault()}>
              <span className="w-6 text-xs font-semibold text-muted-foreground">{LOCALE_SHORT[l]}</span>
              {t(`lang.${l}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
