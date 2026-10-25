import { ArrowLeft, Printer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
 * Every slide on its own 16:9 page, for "Save as PDF" in the print dialog.
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
        <Button size="sm" onClick={() => window.print()}>
          <Printer /> {t("print.save")}
        </Button>
      </div>
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
  );
}
