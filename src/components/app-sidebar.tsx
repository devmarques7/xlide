import {
  CalendarDays, Clock, FileText, Folder, Home, LayoutGrid, ListOrdered, type LucideIcon, Monitor, Music2, Palette, Radio,
  Shapes, SlidersHorizontal, PaintBucket, Users, AudioLines, Presentation,
} from "lucide-react";
import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Logo } from "@/components/logo";
import type { TKey } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

type Item = { to: string; key: TKey; icon: LucideIcon };
type Group = { key?: TKey; items: Item[] };

/* Um só menu para o XLIDE. Os mesmos grupos e a mesma ordem do menu das telas em /v2
   (public/v2/assets/shell.js, NAV): mude os dois juntos. Caminhos em /v2 são páginas estáticas. */
export const NAV: Group[] = [
  { items: [{ to: "/v2/inicio.html", key: "nav.home", icon: Home }, { to: "/v2/arquivos.html", key: "nav.files", icon: Folder }] },
  {
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
    key: "nav.group.studio",
    items: [
      { to: "/v2/kit.html", key: "nav.kit", icon: PaintBucket },
      { to: "/v2/estudio.html", key: "nav.songEditor", icon: AudioLines },
      { to: "/music", key: "nav.music", icon: SlidersHorizontal },
    ],
  },
  {
    key: "nav.group.service",
    items: [
      { to: "/v2/agenda.html", key: "nav.agenda", icon: CalendarDays },
      { to: "/v2/programa.html", key: "nav.programs", icon: ListOrdered },
      { to: "/v2/console.html", key: "nav.console", icon: Radio },
      { to: "/v2/tela.html", key: "nav.screen", icon: Monitor },
      { to: "/v2/relatorio.html", key: "nav.report", icon: Clock },
    ],
  },
  { key: "nav.group.ideas", items: [{ to: "/boards", key: "nav.boards", icon: Shapes }] },
  { key: "nav.group.team", items: [{ to: "/v2/equipe.html", key: "nav.team", icon: Users }] },
];

const rowCls = "flex h-9 items-center gap-3 px-3 text-sm transition-colors hover:bg-muted hover:text-foreground";

export function NavRow({ item, className }: { item: Item; className?: string }) {
  const { t } = usePrefs();
  const Icon = item.icon;
  const body = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{t(item.key)}</span>
    </>
  );
  if (item.to.startsWith("/v2/"))
    return (
      <a href={item.to} className={cn(rowCls, "text-muted-foreground", className)}>
        {body}
      </a>
    );
  return (
    <NavLink to={item.to} end className={({ isActive }) => cn(rowCls, isActive ? "bg-muted text-foreground" : "text-muted-foreground", className)}>
      {body}
    </NavLink>
  );
}

export function AppSidebar() {
  const { t } = usePrefs();
  // o conteúdo das páginas abre espaço para o menu no desktop (index.css: html.has-sidebar)
  useEffect(() => {
    document.documentElement.classList.add("has-sidebar");
    return () => document.documentElement.classList.remove("has-sidebar");
  }, []);
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-border bg-background lg:flex" aria-label="XLIDE">
      <a href="/v2/inicio.html" className="flex h-16 shrink-0 items-center border-b border-border px-4" aria-label="XLIDE">
        <Logo />
      </a>
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map((g, i) => (
          <div key={i} className={i ? "pt-4" : ""}>
            {g.key && <p className="label-xs px-3 pb-1.5 text-muted-foreground">{t(g.key)}</p>}
            {g.items.map((it) => (
              <NavRow key={it.to} item={it} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
