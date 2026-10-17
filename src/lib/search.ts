import { slideFields } from "./analysis";
import { allText, type Locale, type Presentation } from "./types";

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface SearchHit {
  p: Presentation;
  score: number;
  slideIndex?: number;
  snippet?: string;
}

function snippetOf(text: string, q: string) {
  const i = norm(text).indexOf(q);
  if (i < 0) return undefined;
  const start = Math.max(0, i - 40);
  const end = Math.min(text.length, i + q.length + 60);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ") + (end < text.length ? "…" : "");
}

/** Search title, description, tags and every slide field in every language. */
export function searchPresentations(list: Presentation[], query: string, lang: Locale): SearchHit[] {
  const q = norm(query.trim());
  const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  if (!q) return sorted.map((p) => ({ p, score: 0 }));
  const terms = q.split(/\s+/);
  const hits: SearchHit[] = [];
  for (const p of sorted) {
    const title = norm(allText(p.title));
    const meta = norm(`${allText(p.description)} ${(p.tags ?? []).join(" ")} ${p.author ?? ""}`);
    let score = 0;
    let slideIndex: number | undefined;
    let snippet: string | undefined;
    for (const term of terms) {
      let termScore = 0;
      if (title.includes(term)) termScore += 5;
      if (meta.includes(term)) termScore += 2;
      p.slides.forEach((s, i) => {
        for (const f of [...slideFields(s), { name: "notes", value: s.notes }]) {
          const value = f.value;
          if (!value) continue;
          const variants = typeof value === "string" ? [value] : [value[lang], ...Object.values(value)].filter(Boolean) as string[];
          for (const v of variants) {
            if (norm(v).includes(term)) {
              termScore += 1;
              if (slideIndex === undefined) {
                slideIndex = i;
                snippet = snippetOf(v, term);
              }
              return;
            }
          }
        }
      });
      if (!termScore) {
        score = 0;
        break;
      }
      score += termScore;
    }
    if (score > 0) hits.push({ p, score, slideIndex, snippet });
  }
  return hits.sort((a, b) => b.score - a.score);
}
