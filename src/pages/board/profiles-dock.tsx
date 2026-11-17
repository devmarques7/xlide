import { ArrowUpRight, ChevronLeft, ChevronRight, Heart, LayoutGrid, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Board } from "@/lib/boards";
import { useInstagramProfileData, useInstagramProfiles, type IgProfileData, type ProfileSource } from "@/lib/instagram";
import type { MoodItem } from "@/lib/boards";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

const RING = "conic-gradient(from 200deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5, #feda75)";

/** A calm colour per profile, from its name. */
function tone(user: string) {
  let h = 0;
  for (const c of user) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 32% 28%)`;
}
const initials = (user: string) => {
  const parts = user.replace(/^[._]+|[._]+$/g, "").split(/[._]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
};

export function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Always on screen: one round badge per Instagram profile the board mentions
 * (in links, or as the author of a linked reel). A badge opens the profile and
 * lists the cards that cite it.
 */
/** Round avatar: the profile picture when the API gives it, else the initials. */
function Avatar({ user, size, ring = true }: { user: string; size: "sm" | "lg"; ring?: boolean }) {
  const p = useInstagramProfileData(user);
  const pic = p.state === "ok" ? p.data.picture : null;
  return (
    <span className={cn("round grid shrink-0 place-items-center p-[2px]", size === "sm" ? "size-11" : "size-14")} style={{ background: ring ? RING : "transparent" }}>
      {pic ? (
        <img src={pic} alt="" className="round size-full border-2 border-card object-cover" />
      ) : (
        <span className={cn("round grid size-full place-items-center border-2 border-card font-medium text-white", size === "sm" ? "text-[13px]" : "text-base")} style={{ background: tone(user) }}>
          {initials(user)}
        </span>
      )}
    </span>
  );
}

export function ProfilesDock({ board, onGo, onAddToMood }: { board: Board; onGo: (s: ProfileSource) => void; onAddToMood?: (item: Partial<MoodItem> & { type: MoodItem["type"] }) => void }) {
  const { t } = usePrefs();
  const { profiles, unknown, pending } = useInstagramProfiles(board);
  const [open, setOpen] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  if (!profiles.length && !unknown.length && !pending) return null;
  const current = profiles.find((p) => p.user === open);

  return (
    <div ref={root} className="absolute top-1/2 left-3 z-30 flex -translate-y-1/2 items-start gap-2 sm:left-4" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex flex-col items-center gap-2 border border-border bg-card/90 p-1.5 shadow-[0_18px_40px_-20px_rgb(0_0_0/0.45)] backdrop-blur">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex flex-col items-center gap-0.5 px-1 py-1 text-muted-foreground hover:text-foreground"
          title={collapsed ? t("ig.show") : t("ig.hide")}
          aria-label={collapsed ? t("ig.show") : t("ig.hide")}
        >
          <InstagramGlyph className="size-4" />
          <span className="label-xs text-[10px]">{profiles.length}</span>
        </button>
        {!collapsed && (
          <>
            {profiles.map((p) => (
              <button
                key={p.user}
                type="button"
                onClick={() => setOpen((o) => (o === p.user ? null : p.user))}
                className="round relative grid size-11 shrink-0 place-items-center transition-transform hover:scale-105"
                title={`@${p.user}`}
                aria-label={`@${p.user}`}
                aria-expanded={open === p.user}
              >
                <Avatar user={p.user} size="sm" />
                <span className="round label-xs absolute -right-1 -bottom-1 grid h-4 min-w-4 place-items-center bg-foreground px-1 text-[9px] text-background">{p.sources.length}</span>
              </button>
            ))}
            {pending > 0 && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label={t("ig.looking")} />}
            {unknown.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((o) => (o === "?" ? null : "?"))}
                className="round grid size-11 place-items-center border-2 border-dashed border-border text-sm text-muted-foreground"
                title={t("ig.unknown", { n: unknown.length })}
              >
                ?
              </button>
            )}
          </>
        )}
        <button type="button" onClick={() => setCollapsed((c) => !c)} className="grid size-6 place-items-center text-muted-foreground hover:text-foreground" aria-hidden tabIndex={-1}>
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </div>

      {current && (
        <ProfilePanel
          user={current.user}
          url={current.url}
          sources={current.sources}
          onGo={(src) => {
            setOpen(null);
            onGo(src);
          }}
          onAddToMood={onAddToMood}
        />
      )}
      {open === "?" && (
        <div className="w-64 border border-border bg-card p-4 text-sm shadow-[0_24px_50px_-24px_rgb(0_0_0/0.5)]">
          <p className="text-muted-foreground">{t("ig.unknown", { n: unknown.length })}</p>
          <ul className="mt-2 space-y-1">
            {unknown.map((l) => (
              <li key={l.key}>
                <a href={l.url} target="_blank" rel="noreferrer" className="break-all underline">{l.url.replace(/^https?:\/\/(www\.)?/, "")}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfilePanel({ user, url, sources, onGo, onAddToMood }: {
  user: string;
  url: string;
  sources: ProfileSource[];
  onGo: (s: ProfileSource) => void;
  onAddToMood?: (item: Partial<MoodItem> & { type: MoodItem["type"] }) => void;
}) {
  const { t, locale } = usePrefs();
  const p = useInstagramProfileData(user);
  const tag = locale === "pt" ? "pt-BR" : locale === "nl" ? "nl-NL" : "en-GB";
  const n = (v: number | null | undefined, compact = true) => (v === null || v === undefined ? "—" : new Intl.NumberFormat(tag, compact ? { notation: "compact", maximumFractionDigits: 1 } : {}).format(v));
  const pct = (v: number | null) => (v === null ? "—" : `${new Intl.NumberFormat(tag, { maximumFractionDigits: 2 }).format(v * 100)}%`);
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(tag, { day: "numeric", month: "short", year: "numeric" }) : "—");
  const d: IgProfileData | null = p.state === "ok" ? p.data : null;

  const blocks = d
    ? [
        [t("ig.followers"), n(d.followers)],
        [t("ig.following"), n(d.following)],
        [t("ig.posts"), n(d.posts)],
        [t("ig.engagement"), pct(d.stats.engagement)],
        [t("ig.avgLikes"), n(d.stats.avgLikes)],
        [t("ig.avgComments"), n(d.stats.avgComments)],
        [t("ig.perWeek"), d.stats.postsPerWeek === null ? "—" : new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(d.stats.postsPerWeek)],
        [t("ig.lastPost"), date(d.stats.lastPost)],
      ]
    : [];

  return (
    <div className="max-h-[80dvh] w-80 overflow-y-auto border border-border bg-card p-4 shadow-[0_24px_50px_-24px_rgb(0_0_0/0.5)]" style={{ animation: "fade-in 0.15s ease both" }}>
      <div className="flex items-start gap-3">
        <Avatar user={user} size="lg" />
        <div className="min-w-0">
          <p className="font-medium break-words">@{user}</p>
          {d?.name && <p className="text-sm break-words text-muted-foreground">{d.name}</p>}
          <p className="label-xs mt-0.5 text-muted-foreground">{t("ig.refs", { n: sources.length })}</p>
        </div>
      </div>
      {d?.bio && <p className="mt-3 text-sm break-words whitespace-pre-line">{d.bio}</p>}
      {d?.website && (
        <a href={d.website} target="_blank" rel="noreferrer" className="mt-1 block text-sm break-all underline">
          {d.website.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      )}

      {p.state === "loading" && <Loader2 className="mx-auto my-4 size-5 animate-spin text-muted-foreground" />}
      {d && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-1.5">
            {blocks.map(([label, value]) => (
              <div key={label} className="border border-border bg-background p-2.5">
                <p className="label-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl leading-none font-medium tracking-tight">{value}</p>
              </div>
            ))}
          </div>
          {d.recent.length > 0 && (
            <>
              <p className="label-xs mt-4 flex items-center gap-1.5 text-muted-foreground">
                <LayoutGrid className="size-3" /> {t("ig.recent", { n: d.recent.length })}
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-1">
                {d.recent.slice(0, 9).map((m) => (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden bg-muted" title={m.caption}>
                    {m.thumb && <img src={m.thumb} alt="" className="size-full object-cover" loading="lazy" />}
                    <span className="absolute inset-x-0 bottom-0 flex gap-2 bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                      <span className="flex items-center gap-0.5"><Heart className="size-2.5" />{n(m.likes)}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="size-2.5" />{n(m.comments)}</span>
                    </span>
                  </a>
                ))}
              </div>
            </>
          )}
          <p className="label-xs mt-3 text-[9px] text-muted-foreground">{t("ig.source", { d: date(d.fetchedAt) })}</p>
        </>
      )}
      {p.state === "not_configured" && (
        <div className="mt-4 border border-dashed border-border p-3 text-sm">
          <p className="font-medium">{t("ig.connectTitle")}</p>
          <p className="mt-1 text-muted-foreground">{t("ig.connectHint")}</p>
          <a href="https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs underline">
            Meta · Business Discovery <ArrowUpRight className="size-3" />
          </a>
        </div>
      )}
      {p.state === "not_business" && <p className="mt-4 border border-dashed border-border p-3 text-sm text-muted-foreground">{t("ig.notBusiness")}</p>}
      {p.state === "error" && <p className="mt-4 border border-dashed border-border p-3 text-sm text-muted-foreground">{t("ig.error")}</p>}

      <div className="mt-4 flex gap-1.5">
        <a href={url} target="_blank" rel="noreferrer" className="flex h-9 flex-1 items-center justify-center gap-2 bg-foreground text-sm text-background hover:opacity-90">
          <InstagramGlyph className="size-4" /> {t("ig.open")} <ArrowUpRight className="size-3.5" />
        </a>
        {d && onAddToMood && (
          <button
            type="button"
            onClick={() =>
              onAddToMood({
                type: "note",
                title: `@${d.username}${d.name ? ` · ${d.name}` : ""}`,
                text: [...blocks.map(([l, v]) => `${l}: ${v}`), "", `instagram.com/${d.username}`, t("ig.source", { d: date(d.fetchedAt) })].join("\n"),
                color: "#d62976",
                w: 300,
              })
            }
            className="h-9 border border-border px-3 text-sm hover:bg-accent"
            title={t("ig.toMood")}
          >
            {t("ig.toMoodShort")}
          </button>
        )}
      </div>

      <p className="label-xs mt-4 text-muted-foreground">{t("ig.citedIn")}</p>
      <ul className="mt-1.5 space-y-0.5">
        {sources.map((s) => (
          <li key={s.id} className="flex items-center gap-1">
            <button type="button" onClick={() => onGo(s)} className={cn("min-w-0 flex-1 py-1 text-left text-sm break-words hover:underline", s.kind === "board" && "pointer-events-none")}>
              {s.title || "—"}
            </button>
            <a href={s.url} target="_blank" rel="noreferrer" className="grid size-6 shrink-0 place-items-center text-muted-foreground hover:text-foreground" title={t("ig.openPost")}>
              <ArrowUpRight className="size-3.5" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
