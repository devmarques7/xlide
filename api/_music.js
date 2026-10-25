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
  const title = data?.videoDetails?.title ?? "";
  const author = data?.videoDetails?.author ?? "";
  const tracks = captionTracks(data);
  // Nothing at all (not even a title) means YouTube refused this server.
  if (!tracks.length) return { id, title, author, error: title ? "no_captions" : "youtube_failed", tracks: [], tried };
  const rank = (t) => (t.kind === "asr" ? 2 : 0) + (lang && !t.languageCode.startsWith(lang) ? 1 : 0);
  const track = [...tracks].sort((a, b) => rank(a) - rank(b))[0];
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
