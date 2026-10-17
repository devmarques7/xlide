import { useLocation, useNavigate } from "react-router-dom";
import { LogoMark } from "@/components/logo";
import { PinPad } from "@/components/pin-pad";
import { FontSizeControl, LanguageMenu, ThemeToggle } from "@/components/prefs-controls";
import { unlock } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";

export default function Login() {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Editorial panel (desktop) */}
      <aside className="relative hidden flex-col justify-between border-r border-border p-10 lg:flex">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full border border-foreground">
              <LogoMark className="size-4" inverted />
            </span>
            <span className="label-xs">by xlide.app</span>
          </span>
          <span className="label-xs text-muted-foreground">v1.0 — 2026</span>
        </div>
        <div>
          <h1 className="display text-[clamp(5rem,13vw,13rem)]">Xlide</h1>
          <p className="mt-6 max-w-md text-sm text-muted-foreground">{t("app.tagline")}</p>
          <div className="mt-10 grid grid-cols-3 border-t border-border pt-4 label-xs text-muted-foreground">
            <span>EN · PT · NL</span>
            <span className="text-center">Web · Remote · QR</span>
            <span className="text-right">Light / Dark</span>
          </div>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between gap-2 p-4 sm:p-6">
          <span className="inline-flex items-center gap-2.5 lg:invisible">
            <LogoMark className="size-7" />
            <span className="text-[0.95rem] font-semibold tracking-[0.18em]">XLIDE</span>
          </span>
          <div className="flex items-center gap-1">
            <FontSizeControl compact />
            <LanguageMenu />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-10">
          <LogoMark className="mb-8 size-14 animate-fade-up" />
          <PinPad
            hint={t("login.hint")}
            onSubmit={(code) => {
              const ok = unlock(code);
              if (ok) setTimeout(() => navigate(from, { replace: true }), 350);
              return ok;
            }}
          />
        </div>
      </main>
    </div>
  );
}
