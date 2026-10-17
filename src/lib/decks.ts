import caixaSource from "../../decks/source/a-caixa-com-asas.json";
import caixa from "../../decks/a-caixa-com-asas.json";
import { parseImport, presentationFromImport } from "./importer";
import { SHIPPED_AT, type LText, type Presentation } from "./types";

/** Decks that ship with the app (JSON in /decks; pitch version made by scripts/convert-to-pitch.py). */
export function shippedDeck(id: string, json: unknown, patch: Partial<Presentation> = {}): Presentation {
  const p = presentationFromImport(parseImport(JSON.stringify(json)), "pt");
  return { ...p, ...patch, id, createdAt: SHIPPED_AT, updatedAt: SHIPPED_AT };
}

/** Image paths in the source JSON are relative ("images/x.jpg"); serve them from /images. */
function rootImages(p: Presentation): Presentation {
  const fix = (u?: string) => (u && !/^(https?:|data:|\/)/.test(u) ? `/${u}` : u);
  return { ...p, slides: p.slides.map((s) => ({ ...s, image: fix(s.image), items: s.items?.map((it) => ({ ...it, image: fix(it.image) })) })) };
}

const suffix = (t: LText, add: string): LText =>
  typeof t === "string" ? `${t} · ${add}` : Object.fromEntries(Object.entries(t).map(([k, v]) => [k, `${v} · ${add}`]));

export const SHIPPED_DECKS: Record<string, () => Presentation> = {
  p_caixa: () => shippedDeck("p_caixa", caixa),
  p_caixa_editorial: () => {
    const p = rootImages(shippedDeck("p_caixa_editorial", caixaSource, { template: "editorial" }));
    return { ...p, title: suffix(p.title, "Editorial") };
  },
};
