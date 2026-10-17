import { toast } from "sonner";
import { translate } from "./i18n";
import type { Locale } from "./types";

/**
 * Notices when a newer build is deployed (e.g. a push to main on Vercel) while
 * this tab or home-screen app is still running the old one, and offers a reload.
 */
export function startUpdateCheck(locale: () => Locale) {
  const current = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.getAttribute("src");
  if (!current || location.protocol === "file:") return;
  let offered = false;

  const check = async () => {
    if (offered || document.hidden) return;
    try {
      const html = await (await fetch("/", { cache: "no-store" })).text();
      const latest = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];
      if (latest && latest !== current) {
        offered = true;
        const l = locale();
        toast(translate(l, "app.updateReady"), {
          duration: Infinity,
          action: { label: translate(l, "app.update"), onClick: () => location.reload() },
        });
      }
    } catch {
      /* offline */
    }
  };

  setInterval(check, 60_000);
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
}
