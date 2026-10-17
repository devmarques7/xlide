import { ArrowLeft, BarChart3, Braces, ChevronLeft, ChevronRight, FileText, Palette, Play, Plus, Settings2, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LogoMark } from "@/components/logo";
import { FontSizeControl, PrefsMenu } from "@/components/prefs-controls";
import { ShareDialog } from "@/components/share-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyzeDeck } from "@/lib/analysis";
import { LOCALE_SHORT } from "@/lib/i18n";
import { blankSlide } from "@/lib/importer";
import { usePrefs } from "@/lib/prefs";
import { updatePresentation, usePresentation } from "@/lib/store";
import { LAYOUTS, tx, type Locale, type Presentation, type Slide } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { SlideFrame } from "@/slides/SlideView";
import { SlideContentForm } from "./editor/fields";
import { AnalysisPanel, DeckPanel, DesignPanel, JsonPanel } from "./editor/panels";
import { SlideList } from "./editor/slide-list";

export default function Editor() {
  const { id } = useParams();
  const deck = usePresentation(id);
  const { t, locale } = usePrefs();

  if (!deck) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="text-muted-foreground">{t("editor.notFound")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">{t("nav.back")}</Link>
          </Button>
        </div>
      </div>
    );
  }
  return <EditorInner deck={deck} initialLang={deck.languages.includes(locale) ? locale : deck.defaultLanguage} />;
}

function EditorInner({ deck, initialLang }: { deck: Presentation; initialLang: Locale }) {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(deck.slides[0]?.id);
  const [lang, setLang] = useState<Locale>(initialLang);
  const [tab, setTab] = useState("content");
  const [shareOpen, setShareOpen] = useState(false);

  const editLang = deck.languages.includes(lang) ? lang : deck.defaultLanguage;
  const index = Math.max(0, deck.slides.findIndex((s) => s.id === selected));
  const slide = deck.slides[index];
  const analysis = useMemo(() => analyzeDeck(deck, editLang), [deck, editLang]);

  useEffect(() => {
    if (!deck.slides.some((s) => s.id === selected)) setSelected(deck.slides[0]?.id);
  }, [deck.slides, selected]);

  const update = (patch: Partial<Presentation>) => updatePresentation(deck.id, (p) => ({ ...p, ...patch }));
  const setSlides = (slides: Slide[]) => update({ slides });
  const patchSlide = (patch: Partial<Slide>) =>
    setSlides(deck.slides.map((s) => (s.id === slide?.id ? { ...s, ...patch } : s)));

  const insertAfter = (s: Slide) => {
    const next = [...deck.slides];
    next.splice(index + 1, 0, s);
    setSlides(next);
    setSelected(s.id);
  };

  const go = (i: number) => {
    const s = deck.slides[Math.max(0, Math.min(deck.slides.length - 1, i))];
    if (s) setSelected(s.id);
  };

  const title = tx(deck.title, editLang, deck.defaultLanguage);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-4">
          <Button variant="ghost" size="icon" asChild aria-label={t("nav.back")}>
            <Link to="/">
              <ArrowLeft />
            </Link>
          </Button>
          <LogoMark className="hidden size-6 sm:inline-grid" />
          <div className="min-w-0 flex-1 px-1">
            <p className="label-xs truncate text-muted-foreground">{t("editor.deck")}</p>
            <h1 className="truncate text-sm font-medium uppercase tracking-tight sm:text-base">{title || t("common.untitled")}</h1>
          </div>

          {deck.languages.length > 1 && (
            <div className="hidden items-center gap-1 rounded-lg bg-muted p-1 sm:flex" role="group" aria-label={t("editor.editingIn")}>
              {deck.languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={cn("rounded-md px-2.5 py-1 text-xs font-semibold", editLang === l ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {LOCALE_SHORT[l]}
                </button>
              ))}
            </div>
          )}
          <FontSizeControl compact className="hidden md:inline-flex" />
          <PrefsMenu />
          <Button variant="outline" size="sm" className="h-10" onClick={() => setShareOpen(true)} aria-label={t("editor.share")}>
            <Share2 /> <span className="hidden sm:inline">{t("editor.share")}</span>
          </Button>
          <Button size="sm" className="h-10" onClick={() => navigate(`/present/${deck.id}?lang=${editLang}&slide=${index}`)}>
            <Play /> <span className="hidden sm:inline">{t("editor.present")}</span>
          </Button>
        </div>
        {deck.languages.length > 1 && (
          <div className="flex items-center gap-2 border-t border-border px-4 py-2 sm:hidden">
            <span className="label-xs text-muted-foreground">{t("editor.editingIn")}</span>
            <div className="ml-auto flex gap-1 rounded-lg bg-muted p-1">
              {deck.languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={cn("rounded-md px-3 py-1 text-xs font-semibold", editLang === l ? "bg-background shadow-sm" : "text-muted-foreground")}
                >
                  {LOCALE_SHORT[l]}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Slides rail */}
        <aside className="order-2 border-b border-border lg:order-1 lg:w-56 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-4 xl:w-64">
          <div className="flex items-center justify-between px-4 pt-3 lg:px-0 lg:pt-0 lg:pb-3">
            <span className="label-xs text-muted-foreground">
              {t("editor.slides")} · {deck.slides.length}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={t("editor.addSlide")}>
                  <Plus /> <span className="lg:hidden xl:inline">{t("editor.addSlide")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("editor.layout")}</DropdownMenuLabel>
                {LAYOUTS.map((l) => (
                  <DropdownMenuItem key={l} onSelect={() => insertAfter(blankSlide(l))}>
                    {t(`layout.${l}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <SlideList
            slides={deck.slides}
            selected={slide?.id}
            lang={editLang}
            fallback={deck.defaultLanguage}
            issueCount={(i) => analysis.slides[i]?.issues.filter((x) => x.severity === "warn").length ?? 0}
            onSelect={setSelected}
            onReorder={setSlides}
            onDuplicate={(sid) => {
              const s = deck.slides.find((x) => x.id === sid);
              if (s) insertAfter({ ...structuredClone(s), id: uid("s_") });
            }}
            onDelete={(sid) => setSlides(deck.slides.filter((x) => x.id !== sid))}
          />
        </aside>

        {/* Stage */}
        <main className="order-1 flex flex-col gap-3 p-4 lg:order-2 lg:min-w-0 lg:flex-1 lg:justify-center lg:overflow-y-auto lg:bg-muted/40 lg:p-8">
          {slide ? (
            <>
              <div className="mx-auto w-full max-w-5xl">
                <SlideFrame slide={slide} lang={editLang} fallback={deck.defaultLanguage} className="shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]" />
              </div>
              <div className="mx-auto flex w-full max-w-5xl items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t("present.prev")}>
                  <ChevronLeft />
                </Button>
                <span className="label-xs tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")} / {String(deck.slides.length).padStart(2, "0")}
                </span>
                <Button variant="ghost" size="icon-sm" onClick={() => go(index + 1)} disabled={index === deck.slides.length - 1} aria-label={t("present.next")}>
                  <ChevronRight />
                </Button>
                <span className="label-xs ml-auto text-muted-foreground">{t(`layout.${slide.layout}`)}</span>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground">{t("editor.selectSlide")}</p>
          )}
        </main>

        {/* Inspector */}
        <aside className="order-3 lg:w-[22rem] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-border xl:w-[26rem]">
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col">
            <div className="z-30 border-b border-border bg-background/95 p-3 backdrop-blur lg:sticky lg:top-0">
              <TabsList className="w-full">
                <TabsTrigger value="content" aria-label={t("editor.content")}>
                  <FileText /> <span className="hidden min-[400px]:inline">{t("editor.content")}</span>
                </TabsTrigger>
                <TabsTrigger value="design" aria-label={t("editor.design")}>
                  <Palette /> <span className="hidden min-[400px]:inline">{t("editor.design")}</span>
                </TabsTrigger>
                <TabsTrigger value="analysis" aria-label={t("editor.analysis")}>
                  <BarChart3 />
                  <span className="hidden min-[400px]:inline">{t("editor.analysis")}</span>
                </TabsTrigger>
                <TabsTrigger value="json" aria-label={t("editor.json")}>
                  <Braces />
                </TabsTrigger>
                <TabsTrigger value="deck" aria-label={t("editor.deck")}>
                  <Settings2 />
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="p-4 pb-24 lg:pb-8">
              <TabsContent value="content">
                {slide && (
                  <SlideContentForm
                    key={slide.id}
                    slide={slide}
                    lang={editLang}
                    languages={deck.languages}
                    fallback={deck.defaultLanguage}
                    onChange={patchSlide}
                  />
                )}
              </TabsContent>
              <TabsContent value="design">
                {slide && <DesignPanel slide={slide} lang={editLang} fallback={deck.defaultLanguage} onChange={patchSlide} />}
              </TabsContent>
              <TabsContent value="analysis">
                <AnalysisPanel deck={deck} slideIndex={index} lang={editLang} onGo={go} />
              </TabsContent>
              <TabsContent value="json">
                <JsonPanel
                  deck={deck}
                  onReplace={(slides) => {
                    setSlides(slides);
                    setSelected(slides[0]?.id);
                  }}
                  onAppend={(slides) => setSlides([...deck.slides, ...slides])}
                />
              </TabsContent>
              <TabsContent value="deck">
                <DeckPanel deck={deck} lang={editLang} onChange={update} />
              </TabsContent>
            </div>
          </Tabs>
        </aside>
      </div>

      <ShareDialog id={deck.id} title={title} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
