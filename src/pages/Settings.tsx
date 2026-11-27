import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Copy, Download, Eye, EyeOff, PlugZap, RefreshCw } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { usePrefs } from "@/lib/prefs";
import { myMcpToken, rotateMcpToken, supabaseEnabled } from "@/lib/supabase";
import { useRole } from "@/lib/use-role";
import { AuditPanel } from "@/pages/Audit";
import type { TKey } from "@/lib/i18n";

type Tab = "connect" | "skill" | "audit";
type Test = { state: "idle" | "testing" | "ok" | "fail"; text?: string };

function useCopy() {
  const [done, setDone] = useState<string | null>(null);
  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement("textarea"), { value: text });
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(id);
    setTimeout(() => setDone((d) => (d === id ? null : d)), 1800);
  };
  return { done, copy };
}

const btn = "label-xs inline-flex items-center gap-2 border border-border px-3 py-2 hover:bg-muted disabled:opacity-40";
const solid = "label-xs inline-flex items-center gap-2 border border-foreground bg-foreground px-3 py-2 text-background hover:opacity-90 disabled:opacity-40";

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[36px_1fr] gap-3 border-t border-border py-4">
      <span className="font-mono text-xl">{String(n).padStart(2, "0")}</span>
      <div className="grid gap-2">
        <b className="font-semibold">{title}</b>
        {children}
      </div>
    </li>
  );
}

/** Conectar ao Claude: a chave da pessoa já vem montada no link do MCP. */
function ConnectPanel() {
  const { t } = usePrefs();
  const { done, copy } = useCopy();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [show, setShow] = useState(false);
  const [test, setTest] = useState<Test>({ state: "idle" });
  const [server, setServer] = useState<string | null>(null);

  useEffect(() => {
    void myMcpToken().then(setToken).catch(() => setToken(null));
    void fetch("/api/info")
      .then((r) => r.json())
      .then((j) => setServer(j.supabase ?? null))
      .catch(() => {});
  }, []);

  const url = token ? `${location.origin}/api/mcp?key=${token}` : "";
  const masked = token ? `${location.origin}/api/mcp?key=${token.slice(0, 5)}${"•".repeat(16)}${token.slice(-4)}` : "";
  const cli = `claude mcp add --transport http xlide "${url}"`;

  const runTest = async () => {
    if (!token) return;
    setTest({ state: "testing" });
    try {
      const r = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${token}` },
        body: JSON.stringify([
          { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "xlide-settings", version: "1" } } },
          { jsonrpc: "2.0", id: 2, method: "tools/list" },
        ]),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) return setTest({ state: "fail", text: j?.message || `${r.status} ${j?.error ?? ""}` });
      const tools = Array.isArray(j) ? j[1]?.result?.tools?.length : 0;
      setTest({ state: "ok", text: t("set.testOk", { n: tools ?? 0 }) });
    } catch (e) {
      setTest({ state: "fail", text: String((e as Error).message) });
    }
  };
  const rotate = async () => {
    if (!confirm(t("set.rotateConfirm"))) return;
    const n = await rotateMcpToken().catch(() => null);
    if (n) {
      setToken(n);
      setShow(true);
      setTest({ state: "idle" });
    }
  };

  if (!supabaseEnabled) return <p className="border border-border p-4 text-sm">{t("set.noCloud")}</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <section className="grid content-start gap-4 border border-border p-4 sm:p-6">
        <div className="grid gap-1">
          <span className="label-xs text-muted-foreground">{t("set.myLink")}</span>
          <p className="text-sm text-muted-foreground">{t("set.myLinkHint")}</p>
        </div>
        {server === "server_key_invalid" && <p className="border border-destructive p-3 text-sm text-destructive">{t("set.serverKey")}</p>}
        {token === undefined ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : token ? (
          <>
            <code className="block break-all border border-border bg-muted/40 p-3 font-mono text-xs">{show ? url : masked}</code>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={solid} onClick={() => copy("url", url)}>
                {done === "url" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {done === "url" ? t("set.copied") : t("set.copyLink")}
              </button>
              <button type="button" className={btn} onClick={() => setShow((s) => !s)}>
                {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {show ? t("set.hideKey") : t("set.showKey")}
              </button>
              <button type="button" className={btn} onClick={() => copy("key", token)}>
                {done === "key" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {t("set.copyKey")}
              </button>
              <button type="button" className={btn} onClick={runTest} disabled={test.state === "testing"}>
                <PlugZap className="size-3.5" /> {test.state === "testing" ? t("set.testing") : t("set.test")}
              </button>
              <button type="button" className={btn} onClick={rotate}>
                <RefreshCw className="size-3.5" /> {t("set.rotate")}
              </button>
            </div>
            {test.state === "ok" && <p className="border border-border p-3 text-sm">✓ {test.text}</p>}
            {test.state === "fail" && <p className="border border-destructive p-3 text-sm text-destructive">{t("set.testFail")} {test.text}</p>}
          </>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm">{t("set.noKey")}</p>
            <button type="button" className={solid + " justify-self-start"} onClick={rotate}>
              <RefreshCw className="size-3.5" /> {t("set.createKey")}
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("set.keyPrivate")}</p>
      </section>

      <section className="grid content-start gap-2 border border-border p-4 sm:p-6">
        <span className="label-xs text-muted-foreground">{t("set.howTo")}</span>
        <ol>
          <Step n={1} title={t("set.s1")}>
            <p className="text-sm text-muted-foreground">{t("set.s1d")}</p>
          </Step>
          <Step n={2} title={t("set.s2")}>
            <p className="text-sm text-muted-foreground">{t("set.s2d")}</p>
            <a className={btn + " justify-self-start"} href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer">
              claude.ai → {t("set.connectors")}
            </a>
          </Step>
          <Step n={3} title={t("set.s3")}>
            <p className="text-sm text-muted-foreground">{t("set.s3d")}</p>
          </Step>
          <Step n={4} title={t("set.s4")}>
            <p className="text-sm text-muted-foreground">{t("set.s4d")}</p>
            {token && (
              <button type="button" className={btn + " justify-self-start"} onClick={() => copy("cli", cli)}>
                {done === "cli" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {t("set.copyCli")}
              </button>
            )}
          </Step>
        </ol>
      </section>
    </div>
  );
}

/** Skill especialista: vai sozinha pelo MCP; o .zip deixa fixa no Claude. */
function SkillPanel() {
  const { t } = usePrefs();
  const items: [TKey, TKey][] = [
    ["set.k1", "set.k1d"],
    ["set.k2", "set.k2d"],
    ["set.k3", "set.k3d"],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="grid content-start gap-4 border border-border p-4 sm:p-6">
        <span className="label-xs text-muted-foreground">XLIDE · {t("set.expert")}</span>
        <p className="text-sm">{t("set.skillIntro")}</p>
        <ul className="grid gap-px border border-border bg-border">
          {items.map(([k, d]) => (
            <li key={k} className="grid gap-1 bg-background p-3">
              <b className="text-sm font-semibold">{t(k)}</b>
              <span className="text-sm text-muted-foreground">{t(d)}</span>
            </li>
          ))}
        </ul>
        <p className="border border-border p-3 text-sm">{t("set.skillAuto")}</p>
      </section>
      <section className="grid content-start gap-4 border border-border p-4 sm:p-6">
        <span className="label-xs text-muted-foreground">{t("set.downloads")}</span>
        <div className="flex flex-wrap gap-2">
          <a className={solid} href="/downloads/xlide-especialista.zip" download>
            <Download className="size-3.5" /> {t("set.dlSkill")}
          </a>
          <a className={btn} href="/downloads/xlide-contexto.md" download>
            <Download className="size-3.5" /> {t("set.dlContext")}
          </a>
        </div>
        <ol>
          <Step n={1} title={t("set.u1")}>
            <p className="text-sm text-muted-foreground">{t("set.u1d")}</p>
          </Step>
          <Step n={2} title={t("set.u2")}>
            <p className="text-sm text-muted-foreground">{t("set.u2d")}</p>
            <a className={btn + " justify-self-start"} href="https://claude.ai/settings/capabilities" target="_blank" rel="noreferrer">
              claude.ai → {t("set.capabilities")}
            </a>
          </Step>
          <Step n={3} title={t("set.u3")}>
            <p className="text-sm text-muted-foreground">{t("set.u3d")}</p>
          </Step>
        </ol>
      </section>
    </div>
  );
}

/** Configurações: conectar ao Claude, skill especialista e (admin) auditoria. */
export default function Settings() {
  const { t } = usePrefs();
  const role = useRole();
  const admin = role === "admin";
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab") as Tab | null;
  const tab: Tab = asked === "skill" || (asked === "audit" && admin) ? asked : asked === "audit" && role === null ? "audit" : "connect";
  const tabs: [Tab, TKey][] = [
    ["connect", "set.tab.connect"],
    ["skill", "set.tab.skill"],
    ...(admin ? ([["audit", "set.tab.audit"]] as [Tab, TKey][]) : []),
  ];
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto grid max-w-[90rem] gap-6 px-4 py-8 sm:px-6 lg:px-10">
        <header className="grid gap-2">
          <span className="label-xs text-muted-foreground">XLIDE</span>
          <h1 className="display text-5xl">{t("set.title")}</h1>
        </header>
        <nav className="flex flex-wrap border-b border-border" role="tablist">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setParams(k === "connect" ? {} : { tab: k }, { replace: true })}
              className={`label-xs -mb-px border-b-2 px-4 py-3 ${tab === k ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t(label)}
            </button>
          ))}
        </nav>
        {tab === "connect" && <ConnectPanel />}
        {tab === "skill" && <SkillPanel />}
        {tab === "audit" && (admin ? <AuditPanel /> : <p className="text-sm text-muted-foreground">…</p>)}
      </main>
    </div>
  );
}
