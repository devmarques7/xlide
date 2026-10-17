import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Logo } from "@/components/logo";
import { FontSizeControl, LanguageMenu, PrefsMenu, ThemeToggle } from "@/components/prefs-controls";
import { Button } from "@/components/ui/button";
import { lock } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export function AppHeader({ children, className }: { children?: ReactNode; className?: string }) {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const nav = (to: string, label: string) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn("label-xs rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground", isActive ? "text-foreground" : "text-muted-foreground")
      }
    >
      {label}
    </NavLink>
  );
  return (
    <header className={cn("sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md", className)}>
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-2 px-4 sm:h-16 sm:px-6">
        <Link to="/" className="mr-2 shrink-0" aria-label="XLIDE">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {nav("/", t("nav.dashboard"))}
          {nav("/identity", t("nav.identity"))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {children}
          <div className="hidden items-center gap-1 md:flex">
            <FontSizeControl compact />
            <LanguageMenu />
            <ThemeToggle />
          </div>
          <div className="md:hidden">
            <PrefsMenu />
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("nav.lock")}
            title={t("nav.lock")}
            onClick={() => {
              lock();
              navigate("/login");
            }}
          >
            <Lock />
          </Button>
        </div>
      </div>
      <nav className="flex gap-1 border-t border-border px-2 py-1 sm:hidden">
        {nav("/", t("nav.dashboard"))}
        {nav("/identity", t("nav.identity"))}
      </nav>
    </header>
  );
}
