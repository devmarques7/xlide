import { ArrowRight, ListOrdered, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { useShowLive } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { supabase } from "@/lib/supabase";

type Prog = { id: string; title: string; service_date: string | null; starts_at: string | null; status: string; is_live: boolean };

/** Faixa do Live Church no Painel: próximo culto e atalhos. Só o administrador vê. */
export function LiveChurchPanel() {
  const { t, locale } = usePrefs();
  const show = useShowLive();
  const [progs, setProgs] = useState<Prog[] | null>(null);
  useEffect(() => {
    if (!show || !supabase) return;
    void supabase
      .from("xlide_programs")
      .select("id,title,service_date,starts_at,status,is_live")
      .order("service_date", { ascending: true })
      .then(({ data }) => setProgs((data as Prog[] | null) ?? []));
  }, [show]);
  if (!show) return null;
  const list = (progs ?? []).filter((p) => p.status !== "lixeira" && p.status !== "arquivado");
  const today = new Date().toISOString().slice(0, 10);
  const next = list.find((p) => p.is_live) ?? list.find((p) => (p.service_date ?? "") >= today) ?? null;
  const drafts = list.filter((p) => p.status === "rascunho").length;
  const when = next?.service_date
    ? new Date(next.service_date + "T12:00:00").toLocaleDateString(locale === "pt" ? "pt-BR" : locale, { weekday: "long", day: "numeric", month: "long" })
    : "";
  return (
    <section className="mb-10 grid gap-4 border border-border bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-center" aria-label={t("dash.live.title")}>
      <div className="grid gap-1">
        <p className="label-xs text-muted-foreground">
          {t("dash.live.title")} · {t("nav.adminOnly")}
        </p>
        {progs === null ? (
          <p className="text-muted-foreground">…</p>
        ) : next ? (
          <>
            <p className="label-xs text-muted-foreground">{next.is_live ? t("dash.live.onAir") : t("dash.live.next")}</p>
            <a href={`/v2/programa.html?p=${encodeURIComponent(next.id)}`} className="text-xl font-semibold hover:underline">
              {next.title}
            </a>
            <p className="text-sm text-muted-foreground">
              {[when, next.starts_at?.slice(0, 5)].filter(Boolean).join(" · ")}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">{t("dash.live.none")}</p>
        )}
        {progs !== null && list.length > 0 && (
          <p className="label-xs pt-1 text-muted-foreground">
            {t("dash.live.programs", { n: list.length })} · {t("dash.live.drafts", { n: drafts })}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <a href="/v2/programa.html">
            <ListOrdered /> {t("dash.live.open")}
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="/v2/console.html">
            <Radio /> {t("dash.live.console")}
          </a>
        </Button>
        <Button asChild variant="ghost">
          <a href="/v2/inicio.html">
            {t("nav.live.home")} <ArrowRight />
          </a>
        </Button>
      </div>
    </section>
  );
}
