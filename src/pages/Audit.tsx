import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import { supabase } from "@/lib/supabase";

type Row = Record<string, string | number | null | Record<string, unknown>>;
type Report = {
  totals: { sessions: number; people: number; page_views: number; errors: number; empty_searches: number };
  top_pages: Row[]; friction: Row[]; exits: Row[]; not_found: Row[]; errors: Row[]; changes: Row[]; changes_by_person: Row[];
};

/** Relatório de uso e auditoria (xlide_audit_report): mais abertas, dificuldade, saídas, não encontrado, mudanças. */
export default function Audit() {
  const { t } = usePrefs();
  const [days, setDays] = useState(30);
  const [rep, setRep] = useState<Report | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "off">("loading");

  useEffect(() => {
    let live = true;
    (async () => {
      setState("loading");
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const r = await fetch(`/api/audit?days=${days}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null);
      if (!live) return;
      if (!r || !r.ok) return setState("off");
      setRep(await r.json()); setState("ok");
    })();
    return () => { live = false; };
  }, [days]);

  const bars = (rows: Row[], label: string, value: string, extra?: (r: Row) => string) => {
    if (!rows.length) return <p className="text-sm text-muted-foreground">{t("audit.empty_state")}</p>;
    const max = Math.max(...rows.map((r) => Number(r[value]) || 0), 1);
    return (
      <ul className="grid gap-1">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-3 text-sm">
            <span className="relative min-w-0 border border-border px-2 py-1.5">
              <span className="absolute inset-y-0 left-0 bg-muted" style={{ width: `${((Number(r[value]) || 0) / max) * 100}%` }} aria-hidden />
              <span className="relative block truncate">{String(r[label] ?? "—")}{extra ? <span className="text-muted-foreground"> · {extra(r)}</span> : null}</span>
            </span>
            <b className="text-right font-mono text-xs font-normal">{String(r[value] ?? 0)}</b>
          </li>
        ))}
      </ul>
    );
  };
  const box = (title: string, body: React.ReactNode, hint?: string) => (
    <section className="grid content-start gap-3 border border-border p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="-mt-2 text-xs text-muted-foreground">{hint}</p>}
      {body}
    </section>
  );

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <Link to="/" className="label-xs inline-flex items-center gap-1 text-muted-foreground"><ArrowLeft className="size-3" /> XLIDE</Link>
          <h1 className="display text-5xl">{t("audit.title")}</h1>
        </div>
        <div className="flex border border-border" role="group">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={`label-xs px-3 py-2 ${d === days ? "bg-foreground text-background" : ""}`}>{t("audit.days", { n: d })}</button>
          ))}
        </div>
      </header>
      {state === "off" && <p className="border border-border p-4 text-sm">{t("audit.unavailable")}</p>}
      {state === "ok" && rep && (
        <>
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-5">
            {([["audit.sessions", rep.totals.sessions], ["audit.people", rep.totals.people], ["audit.views", rep.totals.page_views], ["audit.errors", rep.totals.errors], ["audit.empty", rep.totals.empty_searches]] as const).map(([k, v]) => (
              <div key={k} className="grid gap-1 bg-background p-4"><span className="label-xs text-muted-foreground">{t(k)}</span><b className="font-mono text-3xl font-normal">{v ?? 0}</b></div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {box(t("audit.top"), bars(rep.top_pages, "path", "views", (r) => `${r.people ?? 0} · ${r.avg_s ?? 0}s`))}
            {box(t("audit.friction"), bars(rep.friction, "path", "score", (r) => `${r.errors} / ${r.retries} / ${r.empty_searches}`), t("audit.frictionHint"))}
            {box(t("audit.exits"), bars(rep.exits, "path", "sessions"))}
            {box(t("audit.notFound"), bars(rep.not_found, "query", "times", (r) => String(r.path ?? "")))}
            {box(t("audit.errorList"), bars(rep.errors, "message", "times", (r) => String(r.path ?? "")))}
            {box(t("audit.byPerson"), bars(rep.changes_by_person, "person", "changes"))}
          </div>
          {box(t("audit.changes"), rep.changes.length ? (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <tbody>{rep.changes.map((c, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1.5 pr-3 font-mono text-xs text-muted-foreground">{new Date(String(c.at)).toLocaleString()}</td>
                  <td className="pr-3">{String(c.person ?? c.via)}</td>
                  <td className="pr-3 font-mono text-xs">{String(c.action)}</td>
                  <td className="pr-3">{String(c.title ?? c.row_id)}</td>
                  <td className="font-mono text-xs text-muted-foreground">{String(c.table_name).replace("xlide_", "")}{c.diff ? ` · ${Object.keys(c.diff as object).join(", ")}` : ""}</td>
                </tr>))}</tbody>
            </table></div>
          ) : <p className="text-sm text-muted-foreground">{t("audit.empty_state")}</p>)}
        </>
      )}
    </div>
  );
}
