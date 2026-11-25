import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogoGlyph, LogoMark } from "@/components/logo";
import { PinPad } from "@/components/pin-pad";
import { FontSizeControl, LanguageMenu, ThemeToggle } from "@/components/prefs-controls";
import { unlock } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { signInWithEmail, signInWithGoogle, supabase, supabaseEnabled } from "@/lib/supabase";

export default function Login() {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? new URLSearchParams(loc.search).get("from") ?? "/";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  // Volta do Google: o supabase-js troca o código pela sessão; com sessão, segue para onde a pessoa ia.
  useEffect(() => {
    if (!supabase) return;
    // o XLIDE v2 (/v2/…) é HTML à parte, fora do roteador
    const go = () => (from.startsWith("/v2") ? location.replace(from) : navigate(from, { replace: true }));
    supabase.auth.getSession().then(({ data }) => data.session && go());
    const { data } = supabase.auth.onAuthStateChange((_e, session) => session && go());
    return () => data.subscription.unsubscribe();
  }, [from, navigate]);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Editorial panel (desktop) */}
      <aside className="relative hidden flex-col justify-between border-r border-border p-10 lg:flex">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full border border-foreground">
              <LogoGlyph className="size-5" />
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
          <LogoGlyph className="mb-8 size-16 animate-fade-up" title="XLIDE" />
          {supabaseEnabled ? (
            <div className="grid w-full max-w-xs gap-3 text-center">
              <button
                type="button"
                disabled={busy}
                onClick={() => { setBusy(true); setErr(""); signInWithGoogle(from).catch((e) => { setErr(String(e?.message ?? e)); setBusy(false); }); }}
                className="flex h-12 items-center justify-center gap-3 border border-foreground bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6H1.4a12 12 0 0 0 0 10.9z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>
                {busy ? t("login.googleBusy") : t("login.google")}
              </button>
              <p className="text-xs text-muted-foreground">{t("login.googleHint")}</p>
              <span className="label-xs text-muted-foreground">{t("login.or")}</span>
              {sent ? (
                <p className="text-xs" role="status">{t("login.emailSent")}</p>
              ) : (
                <form
                  className="grid gap-2"
                  onSubmit={(e) => { e.preventDefault(); if (!email.includes("@")) return; setBusy(true); setErr(""); signInWithEmail(email.trim(), from).then(() => setSent(true)).catch((x) => setErr(String(x?.message ?? x))).finally(() => setBusy(false)); }}
                >
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("login.email")} autoComplete="email" className="h-11 border border-border bg-background px-3 text-sm outline-none focus:border-foreground" />
                  <button type="submit" disabled={busy} className="h-11 border border-foreground px-4 text-sm font-semibold disabled:opacity-60">{t("login.emailSend")}</button>
                </form>
              )}
              {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
            </div>
          ) : (
            <PinPad
              hint={t("login.hint")}
              onSubmit={(code) => {
                const ok = unlock(code);
                if (ok) setTimeout(() => navigate(from, { replace: true }), 350);
                return ok;
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
