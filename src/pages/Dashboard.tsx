import { Copy, FileJson, MoreHorizontal, Pencil, Play, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Highlight } from "@/components/highlight";
import { ImportPanel } from "@/components/import-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { relativeTime } from "@/lib/format";
import { LOCALE_SHORT } from "@/lib/i18n";
import { presentationFromImport } from "@/lib/importer";
import { usePrefs } from "@/lib/prefs";
import { searchPresentations, type SearchHit } from "@/lib/search";
import { deletePresentation, duplicatePresentation, savePresentation, usePresentations } from "@/lib/store";
import { tx, type Presentation } from "@/lib/types";
import { uid } from "@/lib/utils";
import { SlideFrame } from "@/slides/SlideView";

export default function Dashboard() {
  const { t, locale } = usePrefs();
  const navigate = useNavigate();
  const list = usePresentations();
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => searchPresentations(list, q, locale), [list, q, locale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const createNew = () => {
    const p: Presentation = {
      id: uid("p_"),
      title: { [locale]: t("common.untitled") },
      languages: [locale],
      defaultLanguage: locale,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      slides: [{ id: uid("s_"), layout: "cover", title: { [locale]: "Title" }, eyebrow: "XLIDE" }],
    };
    savePresentation(p);
    navigate(`/p/${p.id}`);
  };

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-[90rem] px-4 sm:px-6">
        {/* Search hero */}
        <section className="flex flex-col items-center pt-14 pb-12 text-center sm:pt-24 sm:pb-16">
          <p className="label-xs text-muted-foreground">{t("dash.greeting")}</p>
          <h1 className="display mt-4 text-[clamp(3.5rem,14vw,9rem)]">Xlide</h1>
          <form
            className="relative mt-8 w-full max-w-2xl sm:mt-10"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (hits[0]) navigate(`/p/${hits[0].p.id}`);
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("dash.search")}
              aria-label={t("dash.search")}
              className="h-14 w-full rounded-2xl border border-border bg-card pr-14 pl-13 text-base shadow-[0_1px_0_rgba(0,0,0,0.02)] outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground sm:h-16 sm:text-lg"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute top-1/2 right-4 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent"
                aria-label={t("common.close")}
              >
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="absolute top-1/2 right-4 hidden -translate-y-1/2 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground sm:block">/</kbd>
            )}
          </form>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={createNew}>
              <Plus /> {t("dash.new")}
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileJson /> {t("dash.import")}
            </Button>
          </div>
        </section>

        {/* Results */}
        <section className="pb-20">
          <div className="flex items-end justify-between border-t border-border pt-4">
            <p className="label-xs text-muted-foreground">
              {q ? t("dash.results") : t("dash.recent")} — {t("dash.items")}: <b className="text-foreground">{hits.length}</b>
            </p>
            <p className="label-xs hidden text-muted-foreground sm:block">{t("dash.shortcut")}</p>
          </div>

          {hits.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">
              {q ? t("dash.empty", { q }) : t("dash.emptyAll")}
            </p>
          ) : (
            <ul className="mt-6 grid gap-x-3 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {hits.map((h, i) => (
                <PresentationCard key={h.p.id} hit={h} q={q} index={i} />
              ))}
            </ul>
          )}
        </section>
      </main>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:w-[min(92vw,40rem)]">
          <DialogHeader>
            <DialogTitle>{t("dash.import")}</DialogTitle>
            <DialogDescription>{t("json.schema")}</DialogDescription>
          </DialogHeader>
          <ImportPanel
            actions={[
              {
                label: t("json.asNew"),
                run: (parsed) => {
                  const p = savePresentation(presentationFromImport(parsed, locale));
                  toast.success(t("json.imported", { n: p.slides.length }));
                  setImportOpen(false);
                  navigate(`/p/${p.id}`);
                },
              },
            ]}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PresentationCard({ hit, q, index }: { hit: SearchHit; q: string; index: number }) {
  const { t, locale } = usePrefs();
  const navigate = useNavigate();
  const { p, slideIndex, snippet } = hit;
  const lang = p.languages.includes(locale) ? locale : p.defaultLanguage;
  const preview = p.slides[slideIndex ?? 0] ?? p.slides[0];
  const title = tx(p.title, lang, p.defaultLanguage);

  return (
    <li className="group animate-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <Link to={`/p/${p.id}`} className="block">
        <div className="relative">
          {preview ? (
            <SlideFrame slide={preview} lang={lang} fallback={p.defaultLanguage} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
          ) : (
            <div className="aspect-video rounded-lg border border-dashed border-border" />
          )}
          {p.tags?.[0] && (
            <Badge className="absolute right-3 bottom-3 bg-black/55 text-[#f1f0ec] backdrop-blur">{p.tags[0]}</Badge>
          )}
        </div>
      </Link>
      <div className="mt-3 flex items-start gap-2">
        <Link to={`/p/${p.id}`} className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {t("dash.slides", { n: p.slides.length })} · {relativeTime(p.updatedAt, locale)}
          </p>
          <h2 className="mt-1 truncate text-lg font-medium uppercase tracking-tight">
            <Highlight text={title} query={q} />
          </h2>
          {q && snippet && slideIndex !== undefined ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              <span className="label-xs mr-1.5 text-foreground">{t("dash.match", { n: slideIndex + 1 })}</span>
              <Highlight text={snippet} query={q} />
            </p>
          ) : (
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{tx(p.description, lang, p.defaultLanguage)}</p>
          )}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Menu">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => navigate(`/p/${p.id}`)}>
              <Pencil /> {t("dash.open")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/present/${p.id}`)}>
              <Play /> {t("dash.present")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => duplicatePresentation(p.id)}>
              <Copy /> {t("dash.duplicate")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                deletePresentation(p.id);
                toast(t("dash.deleted"), { action: { label: t("common.undo"), onClick: () => savePresentation(p) } });
              }}
            >
              <Trash2 /> {t("dash.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-3 flex gap-1 border-b border-border pb-3">
        {p.languages.map((l) => (
          <Badge key={l} variant="outline" className="px-2">
            {LOCALE_SHORT[l]}
          </Badge>
        ))}
      </div>
    </li>
  );
}
