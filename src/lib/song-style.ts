import { loopUrl } from "@/slides/lyrics";

/**
 * A look for a song, picked from the words it uses: a background (wash or
 * worship loop) and a font that fit its theme. Plain keyword scoring, so it
 * runs anywhere, offline, in any of the lyric languages people use most.
 */
export const MOODS = [
  { id: "cross", bg: loopUrl("jT9IykfTWy0"), font: "serif", words: "cruz cross sangue blood calvario calvary cordeiro lamb ressurreicao resurrection ressuscitou risen tumulo tomb kruis bloed lam" },
  { id: "name", bg: loopUrl("2W8F-ZLDEmM"), font: "condensed", words: "nome name nomes names jesus yeshua emanuel immanuel naam" },
  { id: "light", bg: loopUrl("5djr6ofyLLY"), font: "grotesk", words: "luz light gloria glory brilha shine brilhar resplandece radiant sol sun licht glorie stralen" },
  { id: "heaven", bg: loopUrl("CQ0keZI1gds"), font: "serif", words: "ceu ceus heaven heavens nuvem nuvens cloud clouds eterno eternal eternidade trono throne santo holy hemel eeuwig troon heilig" },
  { id: "fire", bg: "wash:ember", font: "condensed", words: "fogo fire espirito spirit chama flame avivamento revival arder burn queima vuur geest" },
  { id: "water", bg: "wash:ocean", font: "serif", words: "agua water aguas waters rio river rios mar sea oceano ocean oceans ondas waves chuva rain fonte fountain water rivier zee" },
  { id: "peace", bg: "wash:midnight", font: "serif", words: "paz peace descanso rest calma still quieto refugio refuge abrigo shelter esconderijo secreto secret lugar vrede rust schuilplaats" },
  { id: "joy", bg: loopUrl("1krnHdrN6q0"), font: "condensed", words: "alegria joy dancar dance danca celebrar celebrate festa grita shout cantar sing louvai praise vreugde dansen zingen" },
  { id: "grace", bg: "wash:gold", font: "serif", words: "graca grace amor love bondade goodness fiel faithful fidelidade faithfulness misericordia mercy bencao blessing genade liefde trouw zegen" },
  { id: "power", bg: loopUrl("w4BuwIA-vg0"), font: "condensed", words: "forca strength poder power poderoso mighty vitoria victory rei king reina reign leao lion guerreiro warrior kracht koning overwinning" },
] as const;

export type MoodId = (typeof MOODS)[number]["id"];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");

/** The best-fitting look for a song from its title (counted twice) and lyrics. */
export function suggestStyle(title: string, lyrics: string): { mood: MoodId; bg: string; font: string } {
  const words = norm(`${title} ${title} ${lyrics}`).split(/\s+/).filter(Boolean);
  const count = new Map<string, number>();
  for (const w of words) count.set(w, (count.get(w) ?? 0) + 1);
  let best: (typeof MOODS)[number] = MOODS[2];
  let top = 0;
  for (const m of MOODS) {
    const score = m.words.split(" ").reduce((n, w) => n + (count.get(w) ?? 0), 0);
    if (score > top) {
      top = score;
      best = m;
    }
  }
  return { mood: best.id, bg: best.bg, font: best.font };
}
