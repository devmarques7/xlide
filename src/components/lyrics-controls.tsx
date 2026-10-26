import { Loader2, Search } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { DEFAULT_BG, FONTS, WASHES } from "@/slides/lyrics";

interface PexelsVideo {
  id: number;
  thumb: string;
  url: string;
  duration: number;
  credit?: string;
}

/** Background for lyrics slides: a colour wash, a Pexels video or any video/image URL. */
export function BackgroundPicker({ value, onChange, onApplyAll }: { value?: string; onChange: (bg: string) => void; onApplyAll?: () => void }) {
  const { t } = usePrefs();
  const current = value || DEFAULT_BG;
  const [q, setQ] = useState("worship light");
  const [videos, setVideos] = useState<PexelsVideo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/music/backgrounds?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setVideos(data.videos ?? []);
      if (data.error) setError(data.error === "no_pexels_key" ? t("bg.noKey") : t("bg.failed"));
    } catch {
      setError(t("bg.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>{t("bg.washes")}</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {WASHES.map((w) => (
            <button
              key={w.id}
              type="button"
              title={w.name}
              aria-label={w.name}
              onClick={() => onChange(`wash:${w.id}`)}
              className={cn("aspect-video border border-border", current === `wash:${w.id}` && "ring-2 ring-foreground ring-offset-1 ring-offset-background")}
              style={{ background: `radial-gradient(circle at 70% 60%, ${w.c[0]}, transparent 60%), radial-gradient(circle at 20% 70%, ${w.c[1]}, transparent 55%), ${w.base}` }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("bg.videos")}</Label>
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("bg.search")} />
          <Button type="submit" variant="outline" size="icon" aria-label={t("bg.search")} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </form>
        {error && <p className="text-xs text-muted-foreground">{error}</p>}
        {videos && !videos.length && !error && <p className="text-xs text-muted-foreground">{t("bg.none")}</p>}
        {videos && videos.length > 0 && (
          <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
            {videos.map((v) => (
              <button
                key={v.id}
                type="button"
                title={v.credit ? t("bg.credit", { name: v.credit }) : undefined}
                onClick={() => onChange(v.url)}
                className={cn("relative aspect-video overflow-hidden border border-border", current === v.url && "ring-2 ring-foreground ring-offset-1 ring-offset-background")}
              >
                <img src={v.thumb} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
                <span className="label-xs absolute right-1 bottom-1 bg-black/60 px-1 text-[0.6rem] text-white">{v.duration}s</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("bg.url")}</Label>
        <Input
          className="font-mono text-xs"
          value={current.startsWith("wash:") ? "" : current}
          onChange={(e) => onChange(e.target.value.trim() || DEFAULT_BG)}
          placeholder="https://….mp4 · youtube.com/watch?v=…"
        />
      </div>
      {onApplyAll && (
        <Button type="button" variant="outline" size="sm" onClick={onApplyAll}>
          {t("bg.applyAll")}
        </Button>
      )}
    </div>
  );
}

export function FontPicker({ value, onChange, onApplyAll }: { value?: string; onChange: (font: string) => void; onApplyAll?: () => void }) {
  const { t } = usePrefs();
  const current = value || FONTS[0].id;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {FONTS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={cn("flex flex-col items-center gap-0.5 border border-border py-2", current === f.id ? "bg-foreground text-background" : "hover:bg-accent")}
          >
            <span className="text-xl leading-none" style={{ fontFamily: f.family } as CSSProperties}>
              Aa
            </span>
            <span className="label-xs text-[0.6rem]">{f.name}</span>
          </button>
        ))}
      </div>
      {onApplyAll && (
        <Button type="button" variant="outline" size="sm" onClick={onApplyAll}>
          {t("font.applyAll")}
        </Button>
      )}
    </div>
  );
}
