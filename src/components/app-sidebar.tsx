import {
  ArrowUpRight, AudioLines, CalendarDays, ChevronDown, Clock, FileText, Folder, Home, LayoutGrid, ListOrdered, type LucideIcon, Map as MapIcon,
  Monitor, Moon, Music2, PaintBucket, Palette, Plus, Presentation, Radio, Shapes, SlidersHorizontal, Sun, Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogoGlyph } from "@/components/logo";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { lock } from "@/lib/auth";
import type { TKey } from "@/lib/i18n";
import { FONT_SCALES, usePrefs } from "@/lib/prefs";
import { LOCALES } from "@/lib/types";
import { useMe, useRole } from "@/lib/use-role";
import { cn } from "@/lib/utils";
import "./app-sidebar.css";

type Item = { to: string; key: TKey; icon: LucideIcon };
type Group = { id?: string; key?: TKey; items: Item[] };

/* Um só menu para o XLIDE. Os mesmos grupos, a mesma ordem e o mesmo visual do menu das telas em /v2
   (public/v2/assets/shell.js, NAV, e ui.css .sbar): mude os dois juntos. Caminhos em /v2 são páginas estáticas. */
export const NAV: Group[] = [
  { items: [{ to: "/v2/inicio.html", key: "nav.home", icon: Home }, { to: "/v2/arquivos.html", key: "nav.files", icon: Folder }] },
  {
    id: "Slides",
    key: "nav.group.slides",
    items: [
      { to: "/v2/biblioteca.html?tab=decks", key: "nav.decks", icon: Presentation },
      { to: "/slides", key: "nav.slidesPanel", icon: LayoutGrid },
      { to: "/v2/biblioteca.html?tab=songs", key: "nav.songs", icon: Music2 },
      { to: "/v2/biblioteca.html?tab=tpl", key: "nav.templates", icon: FileText },
      { to: "/identity", key: "nav.identity", icon: Palette },
    ],
  },
  {
    id: "Estúdio",
    key: "nav.group.studio",
    items: [
      { to: "/v2/kit.html", key: "nav.kit", icon: PaintBucket },
      { to: "/v2/estudio.html", key: "nav.songEditor", icon: AudioLines },
      { to: "/music", key: "nav.music", icon: SlidersHorizontal },
    ],
  },
  {
    id: "Culto",
    key: "nav.group.service",
    items: [
      { to: "/v2/agenda.html", key: "nav.agenda", icon: CalendarDays },
      { to: "/v2/programa.html", key: "nav.programs", icon: ListOrdered },
      { to: "/v2/console.html", key: "nav.console", icon: Radio },
      { to: "/v2/tela.html", key: "nav.screen", icon: Monitor },
      { to: "/v2/relatorio.html", key: "nav.report", icon: Clock },
    ],
  },
  { id: "Ideias", key: "nav.group.ideas", items: [{ to: "/boards", key: "nav.boards", icon: Shapes }] },
  { id: "Equipe", key: "nav.group.team", items: [{ to: "/v2/equipe.html", key: "nav.team", icon: Users }] },
];

/* Folha "Criar": as mesmas opções do v2 (shell.js, CREATE) */
const CREATE: { to: string; key: TKey; desc: TKey; icon: LucideIcon }[] = [
  { to: "/boards", key: "create.mood", desc: "create.moodD", icon: Shapes },
  { to: "/boards", key: "create.map", desc: "create.mapD", icon: MapIcon },
  { to: "/slides?novo=branco", key: "create.deck", desc: "create.deckD", icon: Presentation },
  { to: "/music", key: "create.music", desc: "create.musicD", icon: Music2 },
  { to: "/v2/programa.html?novo=principal", key: "create.program", desc: "create.programD", icon: ListOrdered },
];

const NAV_KEY = "xlide.v2.nav"; // o mesmo do v2: grupo aberto num lado fica aberto no outro
const readOpen = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(NAV_KEY) || "{}");
  } catch {
    return {};
  }
};

function Row({ item }: { item: Item }) {
  const { t } = usePrefs();
  const Icon = item.icon;
  const body = (
    <>
      <Icon className="size-[18px]" />
      <span>{t(item.key)}</span>
    </>
  );
  if (item.to.startsWith("/v2/"))
    return (
      <a href={item.to} className="xsb-i">
        {body}
      </a>
    );
  return (
    <NavLink to={item.to} end className={({ isActive }) => cn("xsb-i", isActive && "on")}>
      {body}
    </NavLink>
  );
}

export function AppSidebar() {
  const { t, locale, setLocale, resolvedTheme, toggleTheme, fontScale, bumpFont } = usePrefs();
  const loc = useLocation();
  const navigate = useNavigate();
  const me = useMe();
  const role = useRole();
  const [open, setOpen] = useState(readOpen);
  const [create, setCreate] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // o conteúdo das páginas abre espaço para o menu no desktop (app-sidebar.css: html.has-sidebar)
  useEffect(() => {
    document.documentElement.classList.add("has-sidebar");
    return () => document.documentElement.classList.remove("has-sidebar");
  }, []);
  // N abre "Criar", como no v2
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable) return;
      setCreate(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const toggle = (id: string, now: boolean) => {
    const next = { ...readOpen(), [id]: !now };
    setOpen(next);
    try {
      localStorage.setItem(NAV_KEY, JSON.stringify(next));
    } catch {
      /* sem storage */
    }
  };
  const go = (to: string) => {
    setCreate(false);
    if (to.startsWith("/v2/")) location.href = to;
    else navigate(to);
  };
  const name = me?.name || "XLIDE";
  const ini = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <aside className="xsb" aria-label="XLIDE">
        <a className="xsb-brand" href="/v2/inicio.html" aria-label="XLIDE">
          <span className="xsb-mark">
            <LogoGlyph className="size-[72%]" />
          </span>
          <span>
            <b>XLIDE</b>
            <small>{t("nav.tagline")}</small>
          </span>
        </a>
        <button type="button" className="xsb-create" onClick={() => setCreate(true)}>
          <Plus className="size-5" />
          <span>{t("nav.create")}</span>
          <kbd>N</kbd>
        </button>
        <nav className="xsb-scroll">
          {NAV.map((g, i) => {
            if (!g.id)
              return (
                <div key={i} className="xsb-top">
                  {g.items.map((it) => (
                    <Row key={it.to} item={it} />
                  ))}
                </div>
              );
            const here = g.items.some((it) => it.to === loc.pathname);
            const isOpen = open[g.id] ?? here;
            return (
              <div key={g.id} className={cn("xsb-g", isOpen && "open")}>
                <button type="button" className="xsb-h" aria-expanded={isOpen} onClick={() => toggle(g.id!, isOpen)}>
                  <span>{t(g.key!)}</span>
                  {here && !isOpen && <i />}
                  <ChevronDown className="size-4" />
                </button>
                <div className="xsb-kids">
                  {g.items.map((it) => (
                    <Row key={it.to} item={it} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="xsb-lang" role="group" aria-label="Idioma / Language / Taal">
          {LOCALES.map((l) => (
            <button key={l} type="button" className={cn(l === locale && "on")} aria-pressed={l === locale} onClick={() => setLocale(l)}>
              {l.toUpperCase()}
            </button>
          ))}
          <button type="button" onClick={toggleTheme} aria-label={t("prefs.theme")} title={t("prefs.theme")}>
            {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
        <div ref={menuRef} style={{ position: "relative" }}>
          {menu && (
            <div className="xsb-menu">
              <div className="xsb-fs">
                {t("prefs.textSize")}
                <span>
                  <button type="button" onClick={() => bumpFont(-1)} disabled={fontScale <= FONT_SCALES[0]} aria-label={t("prefs.smaller")}>
                    A−
                  </button>
                  <button type="button" onClick={() => bumpFont(1)} disabled={fontScale >= FONT_SCALES[FONT_SCALES.length - 1]} aria-label={t("prefs.larger")}>
                    A+
                  </button>
                </span>
              </div>
              <a href="/v2/equipe.html">
                <Users className="size-4" /> {t("nav.team")}
              </a>
              <button
                type="button"
                onClick={() => {
                  lock();
                  navigate("/login");
                }}
              >
                <ArrowUpRight className="size-4" /> {t("nav.signOut")}
              </button>
            </div>
          )}
          <button type="button" className="xsb-me" onClick={() => setMenu((v) => !v)} aria-expanded={menu}>
            <span className="xsb-av">{ini}</span>
            <span style={{ minWidth: 0 }}>
              <b>{name}</b>
              <small>{role ? t(`role.${role}` as TKey) : me?.email}</small>
            </span>
          </button>
        </div>
      </aside>
      <Dialog open={create} onOpenChange={setCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("nav.create")}</DialogTitle>
            <DialogDescription className="sr-only">{t("nav.create")}</DialogDescription>
          </DialogHeader>
          <div className="xsb-create-list">
            {CREATE.map((c) => {
              const Icon = c.icon;
              return (
                <a
                  key={c.key}
                  href={c.to}
                  onClick={(e) => {
                    e.preventDefault();
                    go(c.to);
                  }}
                >
                  <Icon className="size-5" />
                  <span>
                    <b>{t(c.key)}</b>
                    <span>{t(c.desc)}</span>
                  </span>
                  <ArrowUpRight className="size-4" />
                </a>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
