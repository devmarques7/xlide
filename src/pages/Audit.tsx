import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePrefs } from "@/lib/prefs";
import { supabase } from "@/lib/supabase";
import type { TKey } from "@/lib/i18n";

type Row = Record<string, string | number | null | Record<string, unknown>>;
type Person = { id: string; name: string | null; email: string | null; role: string; last_at: string | null; sessions: number; views: number; actions: number; errors: number; changes: number; top_page: string | null };
type Report = {
  totals: { sessions: number; people: number; page_views: number; actions?: number; errors: number; empty_searches: number; changes?: number };
  top_pages: Row[]; friction: Row[]; exits: Row[]; not_found: Row[]; errors: Row[]; changes: Row[]; changes_by_person: Row[];
  journeys?: Row[]; top_actions?: Row[]; slow_pages?: Row[]; people?: Person[];
};
type FeedRow = { at: string; src: "use" | "change"; kind: string; path: string | null; target: string | null; ms: number | null; via: string | null; person: string | null; user_id: string | null };
type Load = "loading" | "ok" | "denied" | "off";

/** /audit antigo → Configurações → Auditoria. */
export default function AuditRedirect() {
  return <Navigate to="/settings?tab=audit" replace />;
}

async function authed(url: string) {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null);
}

/** Nomes curtos para os caminhos (o relatório guarda o caminho cru). */
function pageName(path: unknown): string {
  const p = String(path ?? "—");
  const v2 = /^\/v2\/([a-z-]+)\.html/.exec(p);
  if (v2) return v2[1];
  return p.replace(/^\/(p|present|play|b|view|remote)\/[^/]+/, "/$1/:id");
}

/** Sugestões de jornada a partir dos números (o que olhar primeiro). */
function suggestions(rep: Report, t: (k: TKey, v?: Record<string, string | number>) => string): string[] {
  const out: string[] = [];
  const f = rep.friction[0];
  if (f) out.push(t("audit.sug.friction", { page: pageName(f.path), errors: Number(f.errors) || 0, retries: Number(f.retries) || 0 }));
  const nf = rep.not_found[0];
  if (nf) out.push(t("audit.sug.notFound", { q: String(nf.query), n: Number(nf.times) || 0 }));
  const sessions = rep.totals.sessions || 0;
  const ex = rep.exits[0];
  if (ex && sessions >= 5) {
    const pct = Math.round(((Number(ex.sessions) || 0) / sessions) * 100);
    if (pct >= 30) out.push(t("audit.sug.exit", { page: pageName(ex.path), pct }));
  }
  const slow = rep.slow_pages?.[0];
  if (slow && Number(slow.median_s) >= 90) out.push(t("audit.sug.slow", { page: pageName(slow.path), s: Number(slow.median_s) }));
  const rep2 = (rep.top_actions || []).find((a) => Number(a.retries) >= 3);
  if (rep2) out.push(t("audit.sug.retry", { action: String(rep2.action), n: Number(rep2.retries) }));
  const idle = (rep.people || []).filter((p) => !p.sessions).length;
  if (idle) out.push(t("audit.sug.idle", { n: idle }));
  if (!out.length) out.push(t("audit.sug.none"));
  return out;
}

/** Configurações → Auditoria: tudo o que a equipe faz, onde trava e o que melhorar. Só admin. */
export function AuditPanel() {
  const { t } = usePrefs();
  const [days, setDays] = useState(30);
  const [rep, setRep] = useState<Report | null>(null);
  const [state, setState] = useState<Load>("loading");
  const [person, setPerson] = useState<string>("");
  const [feed, setFeed] = useState<FeedRow[] | null>(null);
  const [onlyChanges, setOnlyChanges] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      setState("loading");
      const r = await authed(`/api/audit?days=${days}`);
      if (!live) return;
      if (r && (r.status === 401 || r.status === 403)) return setState("denied");
      if (!r || !r.ok) return setState("off");
      setRep(await r.json());
      setState("ok");
    })();
    return () => {
      live = false;
    };
  }, [days]);

  useEffect(() => {
    let live = true;
    setFeed(null);
    void (async () => {
      const r = await authed(`/api/audit?feed=1&days=${Math.min(days, 30)}&limit=400${person ? `&person=${person}` : ""}`);
      if (live && r?.ok) setFeed(await r.json());
    })();
    return () => {
      live = false;
    };
  }, [days, person]);

  const tips = useMemo(() => (rep ? suggestions(rep, t) : []), [rep, t]);

  const bars = (rows: Row[] | undefined, label: string, value: string, extra?: (r: Row) => string, name: (v: unknown) => string = (v) => String(v ?? "—")) => {
    if (!rows?.length) return <p className="text-sm text-muted-foreground">{t("audit.empty_state")}</p>;
    const max = Math.max(...rows.map((r) => Number(r[value]) || 0), 1);
    return (
      <ul className="grid gap-1">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-3 text-sm">
            <span className="relative min-w-0 border border-border px-2 py-1.5" title={String(r[label] ?? "")}>
              <span className="absolute inset-y-0 left-0 bg-muted" style={{ width: `${((Number(r[value]) || 0) / max) * 100}%` }} aria-hidden />
              <span className="relative block truncate">
                {name(r[label])}
                {extra ? <span className="text-muted-foreground"> · {extra(r)}</span> : null}
              </span>
            </span>
            <b className="text-right font-mono text-xs font-normal">{String(r[value] ?? 0)}</b>
          </li>
        ))}
      </ul>
    );
  };
  const box = (title: string, body: ReactNode, hint?: string, wide = false) => (
    <section className={`grid content-start gap-3 border border-border p-4 ${wide ? "lg:col-span-2" : ""}`}>
      <h3 className="text-base font-semibold">{title}</h3>
      {hint && <p className="-mt-2 text-xs text-muted-foreground">{hint}</p>}
      {body}
    </section>
  );
  const when = (s: string | null) => (s ? new Date(s).toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
  const feedText = (f: FeedRow) => {
    if (f.src === "change") return `${t(`audit.act.${f.kind}` as TKey)} ${String(f.path ?? "").replace("xlide_", "")} · ${f.target ?? ""}${f.via === "mcp" ? " · MCP" : ""}`;
    const k = f.kind;
    if (k === "page_view") return `${t("audit.ev.open")} ${pageName(f.path)}`;
    if (k === "leave") return `${t("audit.ev.leave")} ${pageName(f.path)}${f.ms ? ` · ${Math.round(f.ms / 1000)}s` : ""}`;
    if (k === "search" || k === "search_empty") return `${t(k === "search" ? "audit.ev.search" : "audit.ev.searchEmpty")} “${f.target ?? ""}” · ${pageName(f.path)}`;
    if (k === "error") return `${t("audit.ev.error")} ${f.target ?? ""} · ${pageName(f.path)}`;
    return `${t(k === "retry" ? "audit.ev.retry" : "audit.ev.action")} ${f.target ?? ""} · ${pageName(f.path)}`;
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-[60ch] text-sm text-muted-foreground">{t("audit.intro")}</p>
        <div className="flex border border-border" role="group">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={`label-xs px-3 py-2 ${d === days ? "bg-foreground text-background" : ""}`}>
              {t("audit.days", { n: d })}
            </button>
          ))}
        </div>
      </div>
      {state === "loading" && <p className="text-sm text-muted-foreground">…</p>}
      {state === "denied" && <p className="border border-border p-4 text-sm">{t("audit.denied")}</p>}
      {state === "off" && <p className="border border-border p-4 text-sm">{t("audit.unavailable")}</p>}
      {state === "ok" && rep && (
        <>
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4 lg:grid-cols-7">
            {(
              [
                ["audit.people", rep.totals.people],
                ["audit.sessions", rep.totals.sessions],
                ["audit.views", rep.totals.page_views],
                ["audit.actions", rep.totals.actions],
                ["audit.changesN", rep.totals.changes],
                ["audit.errors", rep.totals.errors],
                ["audit.empty", rep.totals.empty_searches],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="grid gap-1 bg-background p-4">
                <span className="label-xs text-muted-foreground">{t(k)}</span>
                <b className="font-mono text-3xl font-normal">{v ?? 0}</b>
              </div>
            ))}
          </div>

          {box(
            t("audit.improve"),
            <ol className="grid gap-2 text-sm">
              {tips.map((s, i) => (
                <li key={i} className="grid grid-cols-[24px_1fr] gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>,
            t("audit.improveHint"),
          )}

          {box(
            t("audit.team"),
            rep.people?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="label-xs text-muted-foreground">
                      <th className="py-1.5 pr-3 font-normal">{t("audit.person")}</th>
                      <th className="pr-3 font-normal">{t("audit.lastSeen")}</th>
                      <th className="pr-3 text-right font-normal">{t("audit.sessions")}</th>
                      <th className="pr-3 text-right font-normal">{t("audit.views")}</th>
                      <th className="pr-3 text-right font-normal">{t("audit.actions")}</th>
                      <th className="pr-3 text-right font-normal">{t("audit.changesN")}</th>
                      <th className="pr-3 text-right font-normal">{t("audit.errors")}</th>
                      <th className="pr-3 font-normal">{t("audit.topPage")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rep.people.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="py-1.5 pr-3">
                          {p.name || p.email}
                          <span className="label-xs ml-2 text-muted-foreground">{t(`role.${p.role}` as TKey)}</span>
                        </td>
                        <td className="pr-3 font-mono text-xs">{when(p.last_at)}</td>
                        <td className="pr-3 text-right font-mono text-xs">{p.sessions}</td>
                        <td className="pr-3 text-right font-mono text-xs">{p.views}</td>
                        <td className="pr-3 text-right font-mono text-xs">{p.actions}</td>
                        <td className="pr-3 text-right font-mono text-xs">{p.changes}</td>
                        <td className="pr-3 text-right font-mono text-xs">{p.errors}</td>
                        <td className="pr-3 font-mono text-xs">{p.top_page ? pageName(p.top_page) : "—"}</td>
                        <td>
                          <button type="button" className="label-xs border border-border px-2 py-1 hover:bg-muted" onClick={() => setPerson(person === p.id ? "" : p.id)}>
                            {person === p.id ? t("audit.allPeople") : t("audit.seeActions")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("audit.empty_state")}</p>
            ),
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {box(t("audit.top"), bars(rep.top_pages, "path", "views", (r) => `${r.people ?? 0} · ${r.avg_s ?? 0}s`, pageName))}
            {box(t("audit.friction"), bars(rep.friction, "path", "score", (r) => `${r.errors} / ${r.retries} / ${r.empty_searches}`, pageName), t("audit.frictionHint"))}
            {box(t("audit.journeys"), bars(rep.journeys?.map((j) => ({ ...j, label: `${pageName(j.from)} → ${pageName(j.to)}` })), "label", "times"), t("audit.journeysHint"))}
            {box(t("audit.exits"), bars(rep.exits, "path", "sessions", undefined, pageName))}
            {box(t("audit.topActions"), bars(rep.top_actions, "action", "times", (r) => `${pageName(r.path)}${Number(r.retries) ? ` · ${r.retries}× ${t("audit.repeated")}` : ""}`))}
            {box(t("audit.slow"), bars(rep.slow_pages, "path", "median_s", (r) => `${r.visits} ${t("audit.visits")}`, pageName), t("audit.slowHint"))}
            {box(t("audit.notFound"), bars(rep.not_found, "query", "times", (r) => pageName(r.path)))}
            {box(t("audit.errorList"), bars(rep.errors, "message", "times", (r) => pageName(r.path)))}
          </div>

          {box(
            person ? `${t("audit.feed")} · ${rep.people?.find((p) => p.id === person)?.name ?? ""}` : t("audit.feed"),
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select className="label-xs border border-border bg-background px-2 py-1.5" value={person} onChange={(e) => setPerson(e.target.value)} aria-label={t("audit.person")}>
                  <option value="">{t("audit.allPeople")}</option>
                  {rep.people?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.email}
                    </option>
                  ))}
                </select>
                <label className="label-xs inline-flex items-center gap-2">
                  <input type="checkbox" checked={onlyChanges} onChange={(e) => setOnlyChanges(e.target.checked)} /> {t("audit.onlyChanges")}
                </label>
              </div>
              {!feed ? (
                <p className="text-sm text-muted-foreground">…</p>
              ) : feed.filter((f) => !onlyChanges || f.src === "change").length ? (
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {feed
                        .filter((f) => !onlyChanges || f.src === "change")
                        .map((f, i) => (
                          <tr key={i} className={`border-t border-border ${f.kind === "error" || f.kind === "retry" || f.kind === "search_empty" ? "text-destructive" : ""}`}>
                            <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-xs text-muted-foreground">{when(f.at)}</td>
                            <td className="whitespace-nowrap pr-3">{f.person ?? (f.via === "mcp" ? "MCP" : "—")}</td>
                            <td className="pr-3">{feedText(f)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("audit.empty_state")}</p>
              )}
            </div>,
            t("audit.feedHint"),
          )}
        </>
      )}
    </div>
  );
}
