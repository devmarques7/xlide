// Music slides: lyrics from YouTube captions, Google translation, Pexels backgrounds.
// Shared by the Vercel functions in api/music and the local server.

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/** Video id from a YouTube URL (watch, youtu.be, shorts, embed) or a bare id. */
export function videoId(input) {
  const s = String(input ?? "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/**
 * YouTube clients to ask for player data, in order. Servers in data centres are
 * often refused by one client and served by another, so each is tried in turn.
 */
const CLIENTS = [
  { name: "ANDROID", ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip", client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 34 } },
  { name: "IOS", ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)", client: { clientName: "IOS", clientVersion: "20.10.4", deviceMake: "Apple", deviceModel: "iPhone16,2", osName: "iPhone", osVersion: "18.3.2.22D82" } },
  { name: "TV_EMBED", ua: UA, client: { clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", clientVersion: "2.0" }, thirdParty: { embedUrl: "https://www.youtube.com/" } },
  { name: "WEB_EMBED", ua: UA, client: { clientName: "WEB_EMBEDDED_PLAYER", clientVersion: "1.20250310.01.00" }, thirdParty: { embedUrl: "https://www.youtube.com/" } },
  { name: "MWEB", ua: UA, client: { clientName: "MWEB", clientVersion: "2.20250311.03.00" } },
];

async function playerData(id, c) {
  const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": c.ua, Origin: "https://www.youtube.com" },
    body: JSON.stringify({ videoId: id, context: { client: { ...c.client, hl: "en" }, ...(c.thirdParty ? { thirdParty: c.thirdParty } : {}) } }),
  });
  if (!res.ok) throw new Error(`youtube_${res.status}`);
  return res.json();
}

/** Watch page fallback: the player data embedded in the HTML. */
async function watchPageData(id) {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
  const html = await res.text();
  const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:var|<\/script>)/s);
  return m ? JSON.parse(m[1]) : {};
}

const captionTracks = (d) => d?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

/** Caption cues of a track: [{ start, text }] (seconds). Handles json3 and srv3/xml. */
async function trackCues(baseUrl) {
  const url = baseUrl.replace(/&fmt=[^&]*/, "") + "&fmt=json3";
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const body = await res.text();
  if (!body.trim()) return [];
  if (body.trim().startsWith("{")) {
    const data = JSON.parse(body);
    return (data.events ?? [])
      .filter((e) => e.segs)
      .map((e) => ({ start: (e.tStartMs ?? 0) / 1000, text: e.segs.map((s) => s.utf8 ?? "").join("") }));
  }
  const decode = (t) =>
    t.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return [...body.matchAll(/<(?:p|text)\b[^>]*?(?:t|start)="([\d.]+)"[^>]*>([\s\S]*?)<\/(?:p|text)>/g)].map((m) => ({
    start: m[0].startsWith("<p") ? Number(m[1]) / 1000 : Number(m[1]),
    text: decode(m[2]),
  }));
}

/** Cleans caption text into lyric lines: no [Music] tags or ♪, no empty or repeated-in-a-row lines. */
function toLines(cues) {
  const out = [];
  for (const c of cues) {
    for (const raw of c.text.split("\n")) {
      const line = raw.replace(/[♪♫]/g, "").replace(/\[[^\]]*\]|\([^)]*(music|música|musica|applause)[^)]*\)/gi, "").replace(/\s+/g, " ").trim();
      if (line && line !== out[out.length - 1]) out.push(line);
    }
  }
  return out;
}

/**
 * Lyrics of a YouTube video from its captions. Prefers captions written by
 * people over automatic ones, and the language asked for when there is a choice.
 */
export async function getLyrics(input, lang) {
  const id = videoId(input);
  if (!id) return { error: "bad_url" };
  // First client that returns caption tracks wins; keep why the others failed.
  const tried = [];
  let data = {};
  for (const c of [...CLIENTS, { name: "WATCH" }]) {
    try {
      const d = c.name === "WATCH" ? await watchPageData(id) : await playerData(id, c);
      tried.push({ client: c.name, status: d?.playabilityStatus?.status, reason: d?.playabilityStatus?.reason, tracks: captionTracks(d).length });
      if (!data.videoDetails && d?.videoDetails) data = d;
      if (captionTracks(d).length) {
        data = d;
        break;
      }
    } catch (e) {
      tried.push({ client: c.name, error: String(e?.message ?? e) });
    }
  }
  let title = data?.videoDetails?.title ?? "";
  let author = data?.videoDetails?.author ?? "";
  // YouTube refuses data-centre servers (Vercel) the player data, but oEmbed still names the video.
  if (!title) ({ title = "", author = "" } = await oembed(id).catch(() => ({})));
  const tracks = captionTracks(data);
  const rank = (t) => (t.kind === "asr" ? 2 : 0) + (lang && !t.languageCode.startsWith(lang) ? 1 : 0);
  const track = [...tracks].sort((a, b) => rank(a) - rank(b))[0];
  // No captions, or only automatic ones: a lyrics database has the real words, with stanzas.
  if (title && (!track || track.kind === "asr")) {
    const found = await findLyrics(title, author).catch(() => null);
    if (found) return { id, title, author, ...found, tracks: tracks.map((t) => ({ lang: t.languageCode, auto: t.kind === "asr" })) };
  }
  if (!track) return { id, title, author, error: title ? "no_captions" : "youtube_failed", tracks: [], tried };
  const lines = toLines(await trackCues(track.baseUrl));
  return {
    id,
    title,
    author,
    lang: track.languageCode,
    auto: track.kind === "asr",
    tracks: tracks.map((t) => ({ lang: t.languageCode, auto: t.kind === "asr" })),
    lines,
    error: lines.length ? undefined : "empty_captions",
  };
}

/** Title and channel of a video; oEmbed answers where the player API refuses. */
async function oembed(id) {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`oembed_${res.status}`);
  const d = await res.json();
  return { title: d.title ?? "", author: d.author_name ?? "" };
}

/** "Song (Official Video) | Live from X" → "Song"; "Song with A & B" → "Song". */
export function songName(title) {
  return String(title)
    .replace(/\s*[([](official|lyric|lyrics|live|audio|video|clipe|ao vivo|letra|feat|ft)[^)\]]*[)\]]/gi, "")
    .split(/\s+[|•]\s+|\s+-\s+(?=(official|live|ao vivo|lyric))/i)[0]
    .replace(/\s+(with|feat\.?|ft\.?|part\.?)\s+.*$/i, "")
    .replace(/\s+(official\s+)?(lyric|lyrics|music)?\s*video$/i, "")
    .trim();
}

/** "Artist - Topic" / "ArtistVEVO" → "Artist". */
const artistName = (author) => String(author).replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, " ").trim();

/** Lyric text into rows: one blank row between stanzas, none at the ends. */
function lyricRows(text) {
  return String(text)
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\[[^\]]*\]/g, "").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .split("\n");
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "XLIDE (https://xlide.vercel.app)" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${new URL(url).host}_${res.status}`);
  return res.json();
}

/**
 * Lyrics of a song from free databases, by the video's title and channel:
 * LRCLIB first, then lyrics.ovh (whose suggestions also find the real artist
 * when the channel is a label or a church). Returns null when neither knows it.
 */
export async function findLyrics(title, author) {
  let song = songName(title);
  let artist = artistName(author);
  // "Artist - Song" or "Song - Artist": the part that names the channel is the artist.
  const parts = song.split(/\s+[-–—]\s+/);
  if (parts.length === 2) {
    const [a, b] = parts;
    const isArtist = (x) => artist && (norm(x).includes(norm(artist)) || norm(artist).includes(norm(x)));
    if (isArtist(b)) song = a;
    else {
      song = b;
      if (!isArtist(a)) artist = a.split(/,|&/)[0].trim();
    }
  }
  if (!song) return null;
  const matches = (name) => norm(name).includes(norm(song)) || norm(song).includes(norm(name));

  try {
    const hits = await getJson(`https://lrclib.net/api/search?${new URLSearchParams({ q: `${song} ${artist}`.trim() })}`);
    const hit = (hits ?? []).filter((h) => h.plainLyrics && matches(h.trackName)).sort((a, b) => Number(norm(b.artistName).includes(norm(artist))) - Number(norm(a.artistName).includes(norm(artist))))[0];
    if (hit) return { lines: lyricRows(hit.plainLyrics), song, artist: artist || hit.artistName, source: "LRCLIB" };
  } catch {}

  try {
    const { data = [] } = await getJson(`https://api.lyrics.ovh/suggest/${encodeURIComponent(`${song} ${artist}`.trim())}`);
    const cands = [{ title: song, artist: { name: artist } }, ...data.filter((d) => matches(d.title_short ?? d.title))].filter((c) => c.artist?.name);
    const seen = new Set();
    for (const c of cands) {
      const t = c.title_short ?? c.title;
      const key = norm(`${c.artist.name}/${t}`);
      if (seen.has(key)) continue;
      seen.add(key);
      if (seen.size > 4) break;
      const d = await getJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(c.artist.name)}/${encodeURIComponent(t)}`).catch(() => null);
      if (d?.lyrics?.trim()) return { lines: lyricRows(d.lyrics), song: t, artist: c.artist.name, source: "lyrics.ovh" };
    }
  } catch {}
  return null;
}

/** Translates lines with Google's free endpoint; keeps one output line per input line. */
export async function translateLines(lines, target, source = "auto") {
  const out = [];
  // Batches stay well under the endpoint's URL limit.
  for (let i = 0; i < lines.length; i += 40) {
    const chunk = lines.slice(i, i + 40);
    const params = new URLSearchParams({ client: "gtx", sl: source, tl: target, dt: "t", q: chunk.join("\n") });
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`translate_${res.status}`);
    const data = await res.json();
    const text = (data[0] ?? []).map((p) => p[0]).join("");
    const parts = text.split("\n").map((x) => x.trim());
    // If the line count drifts, fall back to translating line by line.
    if (parts.length !== chunk.length) {
      for (const l of chunk) out.push((await translateLines([l], target, source))[0] ?? l);
    } else out.push(...parts);
  }
  return out;
}

/** Looping video backgrounds from Pexels (needs PEXELS_API_KEY). */
export async function searchBackgrounds(query, key) {
  if (!key) return { error: "no_pexels_key", videos: [] };
  const params = new URLSearchParams({ query: query || "abstract light", per_page: "24", orientation: "landscape" });
  const res = await fetch(`https://api.pexels.com/videos/search?${params}`, { headers: { Authorization: key } });
  if (!res.ok) return { error: `pexels_${res.status}`, videos: [] };
  const data = await res.json();
  return {
    videos: (data.videos ?? []).map((v) => {
      const files = (v.video_files ?? []).filter((f) => f.file_type === "video/mp4");
      // HD is plenty behind text and loads fast; fall back to the largest available.
      const hd = files.filter((f) => f.width && f.width <= 1920).sort((a, b) => b.width - a.width)[0] ?? files[0];
      return { id: v.id, thumb: v.image, url: hd?.link, duration: v.duration, credit: v.user?.name, page: v.url };
    }).filter((v) => v.url),
  };
}
