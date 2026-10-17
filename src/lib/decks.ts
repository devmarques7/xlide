import caixa from "../../decks/a-caixa-com-asas.json";
import caixaEditorial from "../../decks/a-caixa-com-asas.editorial.json";
import { parseImport, presentationFromImport } from "./importer";
import { SHIPPED_AT, type Presentation } from "./types";

/**
 * Decks that ship with the app (JSON in /decks). `version` is an edit date in
 * the past: raise it when a deck changes, and untouched copies in browsers are
 * replaced, while copies the user edited (newer date) are kept.
 */
export function shippedDeck(id: string, json: unknown, version = SHIPPED_AT): Presentation {
  const p = presentationFromImport(parseImport(JSON.stringify(json)), "pt");
  return { ...p, id, createdAt: SHIPPED_AT, updatedAt: version };
}

export const SHIPPED_DECKS: Record<string, () => Presentation> = {
  p_caixa: () => shippedDeck("p_caixa", caixa),
  // v2: aura cover with title, hook and speaker instead of the blank first slide.
  p_caixa_editorial: () => shippedDeck("p_caixa_editorial", caixaEditorial, Date.UTC(2026, 9, 17, 1)),
};
