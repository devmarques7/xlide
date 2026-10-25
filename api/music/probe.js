// TEMPORARY: checks which lyric sources answer from Vercel. Counts only.
import { description, letras, search, ytmLyrics, ytmSearch } from "../_probe.js";
const safe = (p) => p.then((v) => v, (e) => ({ error: String(e?.message ?? e) }));
export default async function handler(req, res) {
  const id = req.query.id || "mZ9yZYo9Mmk";
  const q = req.query.q || "Bondade de Deus Isaias Saad";
  const desc = await safe(description(id));
  const ls = await safe(letras(q));
  res.json({
    search: await safe(search(q)),
    descRows: typeof desc === "string" ? desc.split("\n").length : desc,
    ytmVideo: await safe(ytmLyrics(id)),
    ytmSearch: await safe(ytmSearch(q)),
    letras: Array.isArray(ls) ? ls[0] + " " + ls[1].slice(0, 60) : ls,
  });
}
