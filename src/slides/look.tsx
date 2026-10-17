import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_ACCENT, tx, type Locale, type Presentation, type Template } from "@/lib/types";

/** Deck-level look shared by every slide: template, attention colour, meta line. */
export interface Look {
  template: Template;
  accent: string;
  company?: string;
  deckTitle?: string;
}

const LookCtx = createContext<Look>({ template: "editorial", accent: DEFAULT_ACCENT });

export function lookOf(deck: Presentation | undefined, lang?: Locale): Look {
  return {
    template: deck?.template ?? "editorial",
    accent: deck?.accent ?? DEFAULT_ACCENT,
    company: deck?.author,
    deckTitle: deck ? tx(deck.title, lang ?? deck.defaultLanguage, deck.defaultLanguage) : undefined,
  };
}

export function DeckLook({ deck, lang, children }: { deck: Presentation | undefined; lang?: Locale; children: ReactNode }) {
  return <LookCtx.Provider value={lookOf(deck, lang)}>{children}</LookCtx.Provider>;
}

export const useLook = () => useContext(LookCtx);

/** Readable text colour on top of an accent (for accent-toned slides). */
export function onAccent(hex: string) {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return "#ffffff";
  const [r, g, b] = m.map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.4 ? "#0b0b0b" : "#ffffff";
}
