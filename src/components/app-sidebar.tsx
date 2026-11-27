import {
  CalendarDays, Folder, Home, LayoutGrid, Library, ListOrdered, type LucideIcon, Music2, Palette, Radio, Shapes, Users,
} from "lucide-react";
import { useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "@/components/logo";
import type { TKey } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { supabaseEnabled } from "@/lib/supabase";
import { useRole } from "@/lib/use-role";
import { cn } from "@/lib/utils";

type Item = { to: string; key: TKey; icon: LucideIcon; v2?: boolean };

/* Um só menu para o XLIDE inteiro: decks, boards e identidade (app) + Live Church (/v2, só administrador).
   O mesmo conjunto de abas aparece no menu lateral das telas do Live Church (public/v2/assets/shell.js). */
export const XLIDE_NAV: Item[] = [
  { to: "/", key: "nav.dashboard", icon: LayoutGrid },
  { to: "/boards", key: "nav.boards", icon: Shapes },
  { to: "/identity", key: "nav.identity", icon: Palette },
  { to: "/music", key: "nav.music", icon: Music2 },
];
export const LIVE_NAV: Item[] = [
  { to: "/v2/inicio.html", key: "nav.live.home", icon: Home, v2: true },
  { to: "/v2/programa.html", key: "nav.live.programs", icon: ListOrdered, v2: true },
  { to: "/v2/agenda.html", key: "nav.live.agenda", icon: CalendarDays, v2: true },
  { to: "/v2/console.html", key: "nav.live.console", icon: Radio, v2: true },
  { to: "/v2/biblioteca.html", key: "nav.live.library", icon: Library, v2: true },
  { to: "/v2/arquivos.html", key: "nav.live.files", icon: Folder, v2: true },
  { to: "/v2/equipe.html", key: "nav.live.team", icon: Users, v2: true },
];

/** Live Church aparece só para o administrador (e só com o Supabase ligado). */
export function useShowLive() {
  const role = useRole();
  return supabaseEnabled && role === "admin";
}

const rowCls = "flex h-9 items-center gap-3 px-3 text-sm transition-colors hover:bg-muted hover:text-foreground";

function Row({ item }: { item: Item }) {
  const { t } = usePrefs();
  const Icon = item.icon;
  if (item.v2)
    return (
      <a href={item.to} className={cn(rowCls, "text-muted-foreground")}>
        <Icon className="size-4" />
        <span>{t(item.key)}</span>
      </a>
    );
  return (
    <NavLink to={item.to} end className={({ isActive }) => cn(rowCls, isActive ? "bg-muted text-foreground" : "text-muted-foreground")}>
      <Icon className="size-4" />
      <span>{t(item.key)}</span>
    </NavLink>
  );
}

export function AppSidebar() {
  const { t } = usePrefs();
  const showLive = useShowLive();
  // o conteúdo das páginas abre espaço para o menu no desktop (index.css: html.has-sidebar)
  useEffect(() => {
    document.documentElement.classList.add("has-sidebar");
    return () => document.documentElement.classList.remove("has-sidebar");
  }, []);
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-border bg-background lg:flex" aria-label="XLIDE">
      <Link to="/" className="flex h-16 shrink-0 items-center border-b border-border px-4" aria-label="XLIDE">
        <Logo />
      </Link>
      <nav className="flex-1 overflow-y-auto py-4">
        <p className="label-xs px-3 pb-2 text-muted-foreground">{t("nav.group.xlide")}</p>
        {XLIDE_NAV.map((it) => (
          <Row key={it.to} item={it} />
        ))}
        {showLive && (
          <>
            <p className="label-xs flex items-center justify-between px-3 pt-6 pb-2 text-muted-foreground">
              <span>{t("nav.live")}</span>
              <span className="opacity-60">{t("nav.adminOnly")}</span>
            </p>
            {LIVE_NAV.map((it) => (
              <Row key={it.to} item={it} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
