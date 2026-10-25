const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const yt = (ep, client, body, host="www.youtube.com") => fetch(`https://${host}/youtubei/v1/${ep}?prettyPrint=false`, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA, Origin: `https://${host}` }, body: JSON.stringify({ context: { client: { ...client, hl: "en", gl: "US" } }, ...body }) }).then(r => r.json());
const WEB = { clientName: "WEB", clientVersion: "2.20250312.04.00" };
const REMIX = { clientName: "WEB_REMIX", clientVersion: "1.20250310.01.00" };
const find = (o, k, out=[]) => { if (o && typeof o === "object") { if (k in o) out.push(o[k]); for (const v of Object.values(o)) find(v, k, out); } return out; };

async function search(q) { const d = await yt("search", WEB, { query: q }); return find(d, "videoRenderer").slice(0,3).map(v => [v.videoId, v.title?.runs?.[0]?.text]); }
async function description(id) { const d = await yt("next", WEB, { videoId: id }); const t = find(d, "attributedDescription")[0]?.content ?? ""; return t; }
async function ytmLyrics(id) {
  const d = await yt("next", REMIX, { videoId: id }, "music.youtube.com");
  const tabs = find(d, "tabRenderer"); const lt = tabs.find(t => t.endpoint?.browseEndpoint?.browseId?.startsWith("MPLY"));
  if (!lt) return { err: "no lyrics tab", tabs: tabs.map(t=>t.title) };
  const b = await yt("browse", REMIX, { browseId: lt.endpoint.browseEndpoint.browseId }, "music.youtube.com");
  const txt = find(b, "musicDescriptionShelfRenderer")[0]; const runs = txt?.description?.runs?.map(r=>r.text).join("") ?? "";
  return { rows: runs.split("\n").length, src: txt?.footer?.runs?.[0]?.text };
}
async function ytmSearch(q) { const d = await yt("search", REMIX, { query: q, params: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D" }, "music.youtube.com"); return find(d, "videoId").slice(0,3); }
async function letras(q) { const r = await fetch(`https://solr.sscdn.co/letras/m1/?q=${encodeURIComponent(q)}&wt=json&callback=`, { headers: { "User-Agent": UA } }); const t = await r.text(); return [r.status, t.slice(0, 300)]; }

export { search, description, ytmLyrics, ytmSearch, letras };
