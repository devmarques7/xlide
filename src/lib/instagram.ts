import { useEffect, useMemo, useState } from "react";
import { instagramLinks, type InstagramLink } from "../../shared/board.js";
import type { Board } from "./boards";

/* Reel shortcode → author, kept in this browser (authors don't change). */
type Hit = { author: string; author_url: string } | { failedAt: number };
const KEY = "xlide.igAuthors";
let cache: Record<string, Hit> = {};
try {
  cache = JSON.parse(localStorage.getItem(KEY) || "{}");
} catch {
  cache = {};
}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
};
const inflight = new Set<string>();
const RETRY_MS = 10 * 60 * 1000;

export interface ProfileSource { kind: "node" | "mood" | "board"; id: string; title: string; url: string }
export interface InstagramProfile {
  user: string;
  url: string;
  /** Cards that mention this profile (directly or through one of its posts). */
  sources: ProfileSource[];
  posts: number;
}

/**
 * The Instagram profiles a board mentions: named in links, or the authors of
 * the reels/posts it links to (looked up once through XLIDE's API, then cached).
 */
export function useInstagramProfiles(board: Board) {
  const links = useMemo(() => instagramLinks(board), [board]);
  const [, bump] = useState(0);

  const missing = links.filter((l) => !l.user && l.code && !inflight.has(l.code) && !("author" in (cache[l.code] ?? {})) && !(cache[l.code] && "failedAt" in cache[l.code]! && Date.now() - (cache[l.code] as { failedAt: number }).failedAt < RETRY_MS));
  const missingKey = missing.map((l) => l.code).join(",");

  useEffect(() => {
    if (!missingKey) return;
    const todo = missing.slice(0, 12);
    todo.forEach((l) => inflight.add(l.code!));
    let i = 0;
    const next = async (): Promise<void> => {
      const l = todo[i++];
      if (!l) return;
      try {
        const res = await fetch(`/api/instagram/author?code=${encodeURIComponent(l.code!)}&type=${l.type ?? "reel"}`);
        if (!res.ok || !res.headers.get("content-type")?.includes("json")) throw new Error(String(res.status));
        const d = (await res.json()) as { author: string; author_url: string };
        cache[l.code!] = { author: d.author.toLowerCase(), author_url: d.author_url };
      } catch {
        cache[l.code!] = { failedAt: Date.now() };
      } finally {
        inflight.delete(l.code!);
      }
      save();
      bump((v) => v + 1);
      return next();
    };
    // Three at a time.
    Promise.all([next(), next(), next()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey]);

  const userOf = (l: InstagramLink) => {
    if (l.user) return l.user;
    const hit = l.code ? cache[l.code] : undefined;
    return hit && "author" in hit ? hit.author : undefined;
  };

  const profiles = new Map<string, InstagramProfile>();
  const unknown: InstagramLink[] = [];
  for (const l of links) {
    const user = userOf(l);
    if (!user) {
      if (l.code && cache[l.code] && "failedAt" in cache[l.code]!) unknown.push(l);
      continue;
    }
    const p = profiles.get(user) ?? { user, url: `https://www.instagram.com/${user}/`, sources: [], posts: 0 };
    if (l.code) p.posts++;
    for (const s of l.sources) if (!p.sources.some((x) => x.id === s.id)) p.sources.push({ ...s, url: l.url });
    profiles.set(user, p);
  }
  const pending = links.filter((l) => !l.user && l.code && !cache[l.code]).length;
  return { profiles: [...profiles.values()].sort((a, b) => b.sources.length - a.sources.length || a.user.localeCompare(b.user)), unknown, pending };
}

/* ───── Profile numbers (Meta Business Discovery through /api/instagram/profile) ───── */

export interface IgPost { id: string; caption?: string; type: string; likes: number | null; comments: number | null; at: string; url: string; thumb?: string }
export interface IgProfileData {
  username: string;
  name: string | null;
  bio: string | null;
  website: string | null;
  picture: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  recent: IgPost[];
  stats: { sample: number; avgLikes: number | null; avgComments: number | null; engagement: number | null; postsPerWeek: number | null; lastPost: string | null };
  fetchedAt: string;
}
export type IgProfileState =
  | { state: "loading" }
  | { state: "ok"; data: IgProfileData }
  | { state: "not_configured" }
  | { state: "not_business" }
  | { state: "error"; message: string };

const profileCache = new Map<string, IgProfileState>();
const profileWaiters = new Map<string, Promise<void>>();
const profileSubs = new Set<() => void>();

function loadProfile(user: string) {
  if (profileCache.has(user) || profileWaiters.has(user)) return;
  profileCache.set(user, { state: "loading" });
  const p = (async () => {
    let next: IgProfileState;
    try {
      const res = await fetch(`/api/instagram/profile?user=${encodeURIComponent(user)}`);
      const json = res.headers.get("content-type")?.includes("json") ? await res.json() : {};
      if (res.ok) next = { state: "ok", data: json as IgProfileData };
      else if (json.error === "not_configured" || res.status === 404 && !json.error) next = { state: "not_configured" };
      else if (json.error === "not_business") next = { state: "not_business" };
      else next = { state: "error", message: String(json.error ?? res.status) };
    } catch (e) {
      next = { state: "error", message: String(e) };
    }
    profileCache.set(user, next);
    profileWaiters.delete(user);
    profileSubs.forEach((f) => f());
  })();
  profileWaiters.set(user, p);
}

/** Followers, posts and engagement of one profile; loaded once per session. */
export function useInstagramProfileData(user: string | undefined): IgProfileState {
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump((v) => v + 1);
    profileSubs.add(f);
    if (user) loadProfile(user);
    return () => {
      profileSubs.delete(f);
    };
  }, [user]);
  return (user && profileCache.get(user)) || { state: "loading" };
}
