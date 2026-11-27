import { Bot, Check, Copy, ExternalLink, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createBoard, updateBoard, useBoards, type Board } from "@/lib/boards";
import type { TKey } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { tx, type AiRequest, type DeckIdentity, type Presentation, type Slide } from "@/lib/types";
import { cn } from "@/lib/utils";
import { loadFont } from "@/slides/fonts";

type Color = NonNullable<DeckIdentity["palette"]>[number];
type Role = NonNullable<Color["role"]>;
const ROLES: Role[] = ["primary", "background", "text", "accent", "support"];
const FONT_IDEAS = ["Fraunces", "Instrument Serif", "Playfair Display", "General Sans", "Satoshi", "Inter Tight", "Space Grotesk", "DM Sans"];
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
const isImg = (u: string) => /^data:image\//.test(u) || /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(u) || /images\.unsplash\.com|i\.ytimg\.com/.test(u);

/** O que a identidade muda no visual do deck: destaque e cores/fontes do tema (modelo Brand). */
export function lookFromIdentity(id: DeckIdentity): Partial<Presentation> {
  if (id.apply === false) return {};
  const pal = id.palette ?? [];
  const pick = (r: Role) => pal.find((c) => c.role === r)?.hex;
  const accent = pick("accent") ?? pick("primary") ?? pal[0]?.hex;
  const theme = { light: pick("background"), dark: pick("text"), heading: id.fonts?.heading, body: id.fonts?.body };
  return { ...(accent && isHex(accent) ? { accent } : {}), theme: Object.fromEntries(Object.entries(theme).filter(([, v]) => v)) };
}

/** Mapa mental da identidade: a ideia no centro e Cores, Tipografia, Referências e Tom em volta. */
function identityBoard(b: Board, deck: Presentation, id: DeckIdentity, lang: Presentation["defaultLanguage"], t: (k: TKey) => string): Board {
  const title = tx(deck.title, lang);
  const nodes: Board["nodes"] = [{ id: "idea", kind: "idea", title, text: id.mood || "", x: 1200, y: 0 } as Board["nodes"][number]];
  const edges: Board["edges"] = [];
  const stage = (sid: string, step: number, label: string, x: number, kids: { title: string; text?: string; url?: string; tag?: string }[]) => {
    nodes.push({ id: sid, kind: "stage", step, title: label, x, y: 340 } as Board["nodes"][number]);
    edges.push({ id: "e_" + sid, from: "idea", to: sid });
    kids.forEach((k, i) => {
      const kid = `${sid}${i + 1}`;
      nodes.push({ id: kid, kind: "note", x: x - 40, y: 620 + i * 210, ...k } as Board["nodes"][number]);
      edges.push({ id: "e_" + kid, from: sid, to: kid });
    });
  };
  stage("C", 1, t("id.palette"), 0, (id.palette ?? []).map((c) => ({ title: c.hex, text: [c.name, c.role && t(`id.role.${c.role}` as TKey)].filter(Boolean).join(" · "), tag: "cor" })));
  stage("T", 2, t("id.type"), 800, [
    ...(id.fonts?.heading ? [{ title: id.fonts.heading, text: t("id.heading") }] : []),
    ...(id.fonts?.body ? [{ title: id.fonts.body, text: t("id.body") }] : []),
  ]);
  stage("R", 3, t("id.refs"), 1600, (id.references ?? []).map((r) => ({ title: r.note || r.url.replace(/^https?:\/\//, "").slice(0, 60), text: r.url, url: r.url })));
  stage("M", 4, t("id.mood"), 2400, [...(id.mood ? [{ title: id.mood }] : []), ...(id.notes ? [{ title: t("id.notes"), text: id.notes }] : [])]);
  // referências com imagem também entram no moodboard do mesmo board
  const imgs = (id.references ?? []).filter((r) => isImg(r.url));
  const colors = id.palette ?? [];
  const mood = {
    items: [
      ...colors.map((c, i) => ({ id: "m_c" + i, type: "color", color: c.hex, name: c.name || c.hex, x: i * 240, y: 0, w: 220, h: 120 })),
      ...imgs.map((r, i) => ({ id: "m_r" + i, type: "image", src: r.url, caption: r.note, x: (i % 4) * 340, y: 160 + Math.floor(i / 4) * 360, w: 320, h: 320 })),
    ],
  };
  return { ...b, title: `${title} · ${t("id.tab")}`, idea: id.mood || b.idea, nodes, edges, mood: mood as Board["mood"], arranged: false };
}

export function IdentityPanel({ deck, slide, onChange, onSlide }: { deck: Presentation; slide?: Slide; onChange: (p: Partial<Presentation>) => void; onSlide: (p: Partial<Slide>) => void }) {
  const { t } = usePrefs();
  const boards = useBoards();
  const id: DeckIdentity = deck.identity ?? {};
  const set = (patch: Partial<DeckIdentity>) => {
    const next = { ...id, ...patch };
    onChange({ identity: next, ...lookFromIdentity(next) });
  };
  const pal = id.palette ?? [];
  const refs = id.references ?? [];
  useEffect(() => {
    loadFont(id.fonts?.heading);
    loadFont(id.fonts?.body);
  }, [id.fonts?.heading, id.fonts?.body]);

  const board = id.board ? boards.find((b) => b.id === id.board) : undefined;
  const lang = deck.defaultLanguage;
  const makeBoard = () => {
    if (board) {
      updateBoard(board.id, (b) => identityBoard(b, deck, id, lang, t));
      toast.success(t("id.boardDone"));
      return;
    }
    const b = createBoard(`${tx(deck.title, lang)} · ${t("id.tab")}`, id.mood || "");
    updateBoard(b.id, (x) => identityBoard(x, deck, id, lang, t));
    set({ board: b.id });
    toast.success(t("id.boardDone"));
  };

  // pedido para a IA
  const [scope, setScope] = useState<"deck" | "slide">("deck");
  const cur: AiRequest | undefined = scope === "deck" ? deck.ai : slide?.ai;
  const [text, setText] = useState(cur?.text ?? "");
  useEffect(() => setText(cur?.text ?? ""), [scope, cur?.text, slide?.id]);
  const save = () => {
    const req: AiRequest = { text: text.trim(), at: Date.now(), status: "pedido" };
    if (!req.text) return;
    if (scope === "deck") onChange({ ai: req });
    else onSlide({ ai: req });
  };
  const clear = () => (scope === "deck" ? onChange({ ai: undefined }) : onSlide({ ai: undefined }));
  const slideN = slide ? deck.slides.findIndex((s) => s.id === slide.id) + 1 : 0;
  const message =
    scope === "deck"
      ? `No XLIDE, atenda o pedido do deck "${tx(deck.title, lang)}" (deck_id ${deck.id}): leia get_deck_identity e o pedido em list_ai_requests, monte os slides seguindo as cores, a tipografia e as referências, e marque o pedido como feito.`
      : `No XLIDE, melhore o slide ${slideN} do deck "${tx(deck.title, lang)}" (deck_id ${deck.id}, slide ${slide?.id}): leia get_deck_identity e o pedido em list_ai_requests, siga as cores, a tipografia e as referências, e marque o pedido como feito.`;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{t("id.intro")}</p>

      <div className="flex items-start justify-between gap-3">
        <div>
          <Label>{t("id.apply")}</Label>
          <p className="text-xs text-muted-foreground">{t("id.applyHint")}</p>
        </div>
        <Switch checked={id.apply !== false} onCheckedChange={(v) => set({ apply: v })} />
      </div>

      <Separator />
      <section className="flex flex-col gap-2">
        <Label>{t("id.palette")}</Label>
        {pal.map((c, i) => (
          <div key={i} className="grid grid-cols-[2.25rem_5.5rem_minmax(0,1fr)_6.5rem_2rem] items-center gap-1.5">
            <input
              type="color"
              value={isHex(c.hex) ? c.hex : "#000000"}
              onChange={(e) => set({ palette: pal.map((x, k) => (k === i ? { ...x, hex: e.target.value } : x)) })}
              className="h-9 w-9 cursor-pointer border border-border bg-transparent p-0.5"
              aria-label={c.hex}
            />
            <Input value={c.hex} onChange={(e) => set({ palette: pal.map((x, k) => (k === i ? { ...x, hex: e.target.value.trim() } : x)) })} className="font-mono text-xs" />
            <Input value={c.name ?? ""} placeholder={t("id.colorName")} onChange={(e) => set({ palette: pal.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
            <select
              value={c.role ?? ""}
              onChange={(e) => set({ palette: pal.map((x, k) => (k === i ? { ...x, role: (e.target.value || undefined) as Role | undefined } : x)) })}
              className="h-9 border border-border bg-background px-1.5 text-xs"
            >
              <option value="">—</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`id.role.${r}` as TKey)}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="icon-sm" onClick={() => set({ palette: pal.filter((_, k) => k !== i) })} aria-label="×">
              <Trash2 />
            </Button>
          </div>
        ))}
        {pal.length > 0 && (
          <div className="flex h-8 border border-border">
            {pal.map((c, i) => (
              <span key={i} className="flex-1" style={{ background: isHex(c.hex) ? c.hex : "transparent" }} title={c.name || c.hex} />
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => set({ palette: [...pal, { hex: pal.length ? "#888888" : deck.accent ?? "#1f4bd8", role: pal.length ? undefined : "primary" }] })}>
          <Plus /> {t("id.addColor")}
        </Button>
      </section>

      <Separator />
      <section className="flex flex-col gap-2">
        <Label>{t("id.type")}</Label>
        {(["heading", "body"] as const).map((k) => (
          <div key={k} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t(k === "heading" ? "id.heading" : "id.body")}</span>
            <Input
              defaultValue={id.fonts?.[k] ?? ""}
              key={id.fonts?.[k] ?? k}
              placeholder={k === "heading" ? "Fraunces" : "General Sans"}
              onBlur={(e) => set({ fonts: { ...id.fonts, [k]: e.target.value.trim() || undefined } })}
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-1">
          {FONT_IDEAS.map((f) => (
            <button
              key={f}
              type="button"
              className="border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
              onMouseEnter={() => loadFont(f)}
              onClick={() => set({ fonts: { ...id.fonts, [id.fonts?.heading ? "body" : "heading"]: f } })}
              style={{ fontFamily: `"${f}"` }}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("id.fontHint")}</p>
        {(id.fonts?.heading || id.fonts?.body) && (
          <div className="border border-border p-3">
            <p className="text-2xl leading-tight" style={{ fontFamily: `"${id.fonts?.heading ?? id.fonts?.body}"` }}>
              {tx(deck.title, lang) || "Aa"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: `"${id.fonts?.body ?? id.fonts?.heading}"` }}>
              Aa Bb Cc 0123 — {id.mood || "The quick brown fox jumps over the lazy dog."}
            </p>
          </div>
        )}
      </section>

      <Separator />
      <section className="flex flex-col gap-2">
        <Label>{t("id.refs")}</Label>
        {refs.map((r, i) => (
          <div key={i} className="grid grid-cols-[3rem_minmax(0,1fr)_2rem] items-start gap-2">
            <span className="grid h-12 w-12 place-items-center overflow-hidden border border-border bg-muted">
              {isImg(r.url) ? <img src={r.url} alt="" className="h-full w-full object-cover" /> : <ExternalLink className="size-4 text-muted-foreground" />}
            </span>
            <div className="flex flex-col gap-1">
              <Input value={r.url} placeholder="https://" onChange={(e) => set({ references: refs.map((x, k) => (k === i ? { ...x, url: e.target.value.trim() } : x)) })} />
              <Input value={r.note ?? ""} placeholder={t("id.refNote")} onChange={(e) => set({ references: refs.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)) })} />
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => set({ references: refs.filter((_, k) => k !== i) })} aria-label="×">
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => set({ references: [...refs, { url: "" }] })}>
          <Plus /> {t("id.addRef")}
        </Button>
      </section>

      <Separator />
      <section className="flex flex-col gap-2">
        <Label>{t("id.mood")}</Label>
        <Input defaultValue={id.mood ?? ""} key={"m" + (id.mood ?? "")} placeholder={t("id.moodPh")} onBlur={(e) => set({ mood: e.target.value.trim() || undefined })} />
        <Label className="mt-2">{t("id.notes")}</Label>
        <textarea
          defaultValue={id.notes ?? ""}
          key={"n" + (id.notes ?? "")}
          rows={3}
          onBlur={(e) => set({ notes: e.target.value.trim() || undefined })}
          className="w-full border border-border bg-background p-2 text-sm outline-none focus:border-foreground"
        />
      </section>

      <Separator />
      <section className="flex flex-col gap-2">
        <Label>{t("id.board")}</Label>
        <p className="text-xs text-muted-foreground">{t("id.boardHint")}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={makeBoard}>
            <MapIcon /> {board ? t("id.boardUpdate") : t("id.boardCreate")}
          </Button>
          {board && (
            <Button variant="ghost" size="sm" asChild>
              <a href={`/b/${board.id}`} target="_blank" rel="noreferrer">
                <ExternalLink /> {t("id.boardOpen")}
              </a>
            </Button>
          )}
        </div>
      </section>

      <Separator />
      <section className="flex flex-col gap-2">
        <Label className="flex items-center gap-2">
          <Bot className="size-4" /> {t("id.ai")}
        </Label>
        <p className="text-xs text-muted-foreground">{t("id.aiHint")}</p>
        <div className="grid grid-cols-2 border border-border">
          {(["deck", "slide"] as const).map((k) => (
            <button
              key={k}
              type="button"
              disabled={k === "slide" && !slide}
              onClick={() => setScope(k)}
              className={cn("h-8 text-xs", scope === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              {k === "deck" ? t("id.aiDeck") : `${t("id.aiSlide")} ${slideN || ""}`}
            </button>
          ))}
        </div>
        {cur && (
          <p className={cn("flex items-center gap-1.5 text-xs", cur.status === "feito" ? "text-foreground" : "text-muted-foreground")}>
            {cur.status === "feito" ? <Check className="size-3.5" /> : <Bot className="size-3.5" />}
            {cur.status === "feito" ? `${t("id.aiDone")}${cur.done ? `: ${cur.done}` : ""}` : t("id.aiOpen")}
          </p>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={t("id.aiPh")}
          className="w-full border border-border bg-background p-2 text-sm outline-none focus:border-foreground"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} disabled={!text.trim()}>
            <Bot /> {t("id.aiSend")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(message).then(() => toast.success(t("id.aiCopied")));
            }}
          >
            <Copy /> {t("id.aiCopy")}
          </Button>
          {cur && (
            <Button variant="ghost" size="sm" onClick={clear}>
              {t("id.aiClear")}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
