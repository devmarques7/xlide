import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { downloadPdf } from "@/lib/pdf";
import { usePrefs } from "@/lib/prefs";
import { builtinDeck, usePresentation } from "@/lib/store";
import { LOCALES, tx, type Locale } from "@/lib/types";
import { FillProvider, FillSlide } from "@/slides/fill";
import { DeckLook } from "@/slides/look";
import { SlideView } from "@/slides/SlideView";

function loadAnswers(key: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

/**
 * Every slide on its own 1600×900 page: "Download PDF" builds the file directly; Print stays as a fallback.
 * `fill` (public /fill/:id): empty answer cells and image slots can be filled
 * in first; answers stay in this browser only.
 */
export default function Print({ fill = false }: { fill?: boolean }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t } = usePrefs();
  // Memoised: a fresh builtin copy gets new slide ids, which would remount the fields on every keystroke.
  const shipped = useMemo(() => (id ? builtinDeck(id) : undefined), [id]);
  const deck = usePresentation(id) ?? shipped;
  const asked = params.get("lang") as Locale | null;
  const lang = deck && asked && LOCALES.includes(asked) ? asked : deck?.defaultLanguage ?? "pt";

  const storeKey = `xlide.fill.${id}`;
  const [answers, setAnswers] = useState(() => (fill ? loadAnswers(storeKey) : {}));
  const set = useCallback(
    (key: string, value: string) =>
      setAnswers((prev) => {
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(storeKey, JSON.stringify(next));
        } catch {
          /* storage full or blocked: keep the answers on screen */
        }
        return next;
      }),
    [storeKey],
  );
  const fillApi = useMemo(() => (fill ? { get: (k: string) => answers[k] ?? "", set } : null), [fill, answers, set]);

  const pagesRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const exportPdf = async () => {
    if (!deck || progress) return;
    const pages = [...(pagesRef.current?.querySelectorAll<HTMLElement>(".print-page > .xs") ?? [])];
    setProgress(`0/${pages.length}`);
    try {
      await downloadPdf(pages, `${tx(deck.title, lang, deck.defaultLanguage)}.pdf`, (n, total) => setProgress(`${n}/${total}`));
    } catch (e) {
      console.error(e);
      toast.error(t("print.failed"));
    } finally {
      setProgress(null);
    }
  };

  useEffect(() => {
    if (deck) document.title = tx(deck.title, lang, deck.defaultLanguage);
  }, [deck, lang]);

  if (!deck) return <p className="p-8 text-muted-foreground">{t("editor.notFound")}</p>;

  return (
    <div className="print-deck">
      <div className="print-bar">
        {fill ? (
          <span />
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/p/${deck.id}`}>
              <ArrowLeft /> {t("nav.back")}
            </Link>
          </Button>
        )}
        <span className="text-sm text-muted-foreground">{t(fill ? "fill.hint" : "print.hint")}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.print()} aria-label={t("print.print")}>
            <Printer /> <span className="hidden sm:inline">{t("print.print")}</span>
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={!!progress}>
            {progress ? <Loader2 className="animate-spin" /> : <Download />}
            {progress ? t("print.working", { n: progress }) : t("print.save")}
          </Button>
        </div>
      </div>
      <div ref={pagesRef}>
      <FillProvider value={fillApi}>
        <DeckLook deck={deck} lang={lang}>
          {deck.slides.map((s, i) => (
            <section className="print-page" key={s.id}>
              <FillSlide index={i}>
                <SlideView slide={s} lang={lang} fallback={deck.defaultLanguage} />
              </FillSlide>
            </section>
          ))}
        </DeckLook>
      </FillProvider>
      </div>
    </div>
  );
}
