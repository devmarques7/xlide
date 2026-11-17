// Who posted an Instagram reel/post: Instagram's public oEmbed (no login), cached.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

/** Returns { author, author_url, title } or throws. */
export async function instagramAuthor(shortcode, type = "reel") {
  if (!/^[A-Za-z0-9_-]{5,40}$/.test(shortcode)) throw new Error("bad_shortcode");
  const kind = type === "p" || type === "tv" ? type : "reel";
  const url = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(`https://www.instagram.com/${kind}/${shortcode}/`)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`instagram_${res.status}`);
  const d = await res.json();
  if (!d?.author_name) throw new Error("no_author");
  return { author: String(d.author_name), author_url: String(d.author_url || `https://www.instagram.com/${d.author_name}/`), title: d.title ? String(d.title).slice(0, 200) : undefined };
}

/* ───────── Profile numbers: Meta's Business Discovery (official, free) ─────────
   Needs, on Vercel: IG_GRAPH_TOKEN (a long-lived token of a Facebook user who manages
   an Instagram Business/Creator account, with instagram_basic, instagram_manage_insights
   and pages_read_engagement) and IG_USER_ID (that account's Instagram user id).
   Only other Business/Creator profiles can be looked up. */

export const igGraphConfigured = () => !!(process.env.IG_GRAPH_TOKEN && process.env.IG_USER_ID);

const MEDIA_FIELDS = "id,caption,media_type,media_product_type,like_count,comments_count,timestamp,permalink,thumbnail_url,media_url";
const USER_FIELDS = `username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count,media.limit(12){${MEDIA_FIELDS}}`;

export async function instagramProfile(username) {
  if (!/^[A-Za-z0-9_.]{1,30}$/.test(username)) throw new Error("bad_username");
  const v = process.env.IG_GRAPH_VERSION || "v21.0";
  const fields = `business_discovery.username(${username}){${USER_FIELDS}}`;
  const url = `https://graph.facebook.com/${v}/${process.env.IG_USER_ID}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(process.env.IG_GRAPH_TOKEN)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.business_discovery) {
    const msg = data?.error?.message ?? `graph_${res.status}`;
    // Personal accounts and unknown names come back as errors from Business Discovery.
    const e = new Error(/cannot be found|not.*business|invalid user/i.test(msg) ? "not_business" : msg);
    throw e;
  }
  const u = data.business_discovery;
  const media = (u.media?.data ?? []).map((m) => ({
    id: m.id,
    caption: m.caption ? String(m.caption).slice(0, 140) : undefined,
    type: m.media_product_type === "REELS" ? "reel" : String(m.media_type ?? "").toLowerCase(),
    likes: typeof m.like_count === "number" ? m.like_count : null,
    comments: typeof m.comments_count === "number" ? m.comments_count : null,
    at: m.timestamp,
    url: m.permalink,
    thumb: m.thumbnail_url || (m.media_type === "IMAGE" ? m.media_url : undefined),
  }));
  // Averages over the recent posts that show their counts (likes can be hidden).
  const withLikes = media.filter((m) => m.likes !== null);
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const avgLikes = avg(withLikes.map((m) => m.likes));
  const avgComments = avg(media.filter((m) => m.comments !== null).map((m) => m.comments));
  const times = media.map((m) => Date.parse(m.at)).filter(Number.isFinite).sort((a, b) => a - b);
  const weeks = times.length > 1 ? (times[times.length - 1] - times[0]) / (7 * 24 * 3600 * 1000) : null;
  return {
    username: u.username,
    name: u.name ?? null,
    bio: u.biography ?? null,
    website: u.website ?? null,
    picture: u.profile_picture_url ?? null,
    followers: u.followers_count ?? null,
    following: u.follows_count ?? null,
    posts: u.media_count ?? null,
    recent: media,
    stats: {
      sample: media.length,
      avgLikes,
      avgComments,
      engagement: u.followers_count && avgLikes !== null ? (avgLikes + (avgComments ?? 0)) / u.followers_count : null,
      postsPerWeek: weeks && weeks > 0 ? (times.length - 1) / weeks : null,
      lastPost: times.length ? new Date(times[times.length - 1]).toISOString() : null,
    },
    fetchedAt: new Date().toISOString(),
  };
}
