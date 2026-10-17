import { Download, Share, X } from "lucide-react";
import { useState } from "react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { canFullscreen, isIOS, isStandalone, isTouch, useInstallPrompt } from "@/lib/app-mode";
import { usePrefs } from "@/lib/prefs";

const KEY = "xlide.installHint";

/**
 * On phones that cannot hide the browser UI from a web page (iPhone Safari),
 * explain how to open XLIDE from the home screen. Where the browser offers an
 * install prompt (Android Chrome), show an install button instead.
 */
export function InstallHint() {
  const { t } = usePrefs();
  const { available, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const ios = isIOS() && !canFullscreen();
  if (dismissed || isStandalone() || !isTouch() || (!ios && !available)) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };
  const [before, after] = t("app.iosHint").split("{share}");

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 animate-fade-up px-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto flex max-w-md items-start gap-3 border border-border bg-popover/95 p-3 text-popover-foreground shadow-2xl backdrop-blur-xl">
        <LogoMark className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="label-xs">{t("app.openAsApp")}</p>
          {ios ? (
            <p className="mt-1 text-sm leading-snug">
              {before}
              <Share className="mx-0.5 inline size-4 -translate-y-0.5" aria-label="Share" />
              {after}
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm leading-snug">{t("app.installHint")}</p>
              <Button size="sm" className="mt-2" onClick={() => install().then(close)}>
                <Download /> {t("app.install")}
              </Button>
            </>
          )}
        </div>
        <button type="button" onClick={close} className="grid size-8 place-items-center text-muted-foreground hover:text-foreground" aria-label={t("app.dismiss")}>
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
