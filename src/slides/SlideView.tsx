import { ArrowUpRight, CornerDownRight } from "lucide-react";
import { type CSSProperties } from "react";
import { LogoGlyph } from "@/components/logo";
import { ICONS } from "@/lib/icons";
import { tx, type Locale, type LText, type Slide } from "@/lib/types";
import { cn } from "@/lib/utils";
import { onAccent, useLook } from "./look";
import { PitchCover, PitchFeature, PitchNumbers, PitchSplit, PitchStatement, PitchTeam, PitchToc } from "./pitch";
import { FillImage, FillText } from "./fill";
import { Lyrics } from "./lyrics";
import { Rich } from "./rich";
import { SlideImage } from "./slide-image";
import "./slides.css";

export { SlideImage };

interface Props {
  slide: Slide;
  lang: Locale;
  fallback?: Locale;
  /** Live = presenting/viewing: enforces readable minimum sizes and allows scrolling. */
  live?: boolean;
  /** Reader text scale (1 = 100%). */
  scale?: number;
  /** Run background motion (big preview and presenting; thumbnails stay still). */
  animate?: boolean;
  className?: string;
}

export function SlideView({ slide, lang, fallback, live, scale = 1, animate, className }: Props) {
  const look = useLook();
  const T = (v: LText | undefined) => tx(v, lang, fallback);
  const Layout = LAYOUT_COMPONENTS[slide.layout] ?? Statement;
  const pitch = slide.layout.startsWith("pitch-");
  const tone = slide.tone ?? (slide.layout === "pitch-cover" ? "dark" : undefined);
  return (
    <div
      className={cn("xs", slide.inverse && "inverse", pitch && "tpl-pitch", className)}
      data-layout={slide.layout}
      data-tone={tone}
      data-live={live ? "" : undefined}
      data-animate={animate || live ? "" : undefined}
      style={{ "--k": scale, "--accent": look.accent, "--on-accent": onAccent(look.accent) } as CSSProperties}
      lang={lang}
    >
      <Layout s={slide} T={T} />
    </div>
  );
}

type LayoutProps = { s: Slide; T: (v: LText | undefined) => string };

function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((l, i) => (
        <span key={i}>{l || " "}</span>
      ))}
    </>
  );
}

function Display({ text, className, as: Tag = "h2" }: { text: string; className?: string; as?: "h1" | "h2" }) {
  if (!text) return null;
  return (
    <Tag className={cn("xs-display", className)}>
      <Lines text={text} />
    </Tag>
  );
}

const pad2 = (n: number) => String(n + 1).padStart(2, "0");

/** Aura: centred title over a slow, blurred colour field with film grain. */
function Aura({ s, T }: LayoutProps) {
  return (
    <div className="xs-aura">
      <div className="xs-aura-bg" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="xs-aura-grain" aria-hidden />
      <div className="xs-pad xs-aura-content">
        <LogoGlyph className="xs-aura-mark" />
        <h1 className="xs-aura-title">
          {T(s.title)
            .split("\n")
            .map((line, i, all) => (
              <span key={i}>
                {line}
                {i === all.length - 1 && <sup>©</sup>}
              </span>
            ))}
        </h1>
        {T(s.eyebrow) && <p className="xs-label xs-aura-kicker">{T(s.eyebrow)}</p>}
        {T(s.subtitle) && <p className="xs-aura-hook"><Rich text={T(s.subtitle)} /></p>}
        {T(s.cta) && <p className="xs-label xs-aura-speaker">{T(s.cta)}</p>}
        {T(s.body) && <p className="xs-aura-foot">{T(s.body)}</p>}
      </div>
    </div>
  );
}

function Cover({ s, T }: LayoutProps) {
  // An empty string in the JSON keeps a placeholder for a photo to add later.
  const slot = s.image !== undefined;
  return (
    <div className={cn("xs-pad xs-cover", slot && "has-img", slot && (s.variant === "full" || s.variant === "dim" || s.variant === "color") && "is-full", s.variant === "dim" && "is-dim", s.variant === "color" && "is-color")}>
      <div className="xs-meta3 xs-label">
        <span>{T(s.eyebrow)}</span>
        <span>{T(s.subtitle)}</span>
        <span>{T(s.cta)}</span>
      </div>
      <div className="xs-cover-head">
        <Display as="h1" text={T(s.title)} />
        {T(s.body) && <p className="xs-note">{T(s.body)}</p>}
      </div>
      {slot ? <SlideImage src={s.image || undefined} className="xs-cover-img" /> : (
        <div className="xs-cover-foot xs-label xs-mute">
          <span>01/</span>
          <span>XLIDE</span>
        </div>
      )}
    </div>
  );
}

function Stats({ s, T }: LayoutProps) {
  const items = (s.items ?? []).slice(0, 6);
  return (
    <div className="xs-pad xs-stats">
      <div className="xs-left">
        {T(s.eyebrow) && (
          <div className="xs-brand">
            <span className="xs-brand-mark">
              <LogoGlyph />
            </span>
            <span className="xs-label">{T(s.eyebrow)}</span>
          </div>
        )}
        <Display text={T(s.title)} />
        {T(s.body) && <p className="xs-body"><Rich text={T(s.body)} /></p>}
        {T(s.cta) && <span className="xs-btn">{T(s.cta)}</span>}
      </div>
      {items.length > 0 && (
        <div className="xs-cells">
          {items.map((it) => {
            const Icon = it.icon ? ICONS[it.icon] : undefined;
            return (
              <div className="xs-cell" key={it.id}>
                <div>{Icon && <Icon />}</div>
                <div>
                  {T(it.value) && <div className="xs-value">{T(it.value)}</div>}
                  <div className="xs-label" style={{ marginTop: "1.2cqmin" }}>{T(it.label)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Services({ s, T }: LayoutProps) {
  const items = (s.items ?? []).slice(0, 5);
  return (
    <div className="xs-pad xs-services" style={{ "--rows": Math.max(items.length, 1) } as CSSProperties}>
      <div className="xs-svc-head">
        <span className="xs-label xs-mute">{T(s.eyebrow)}</span>
        {T(s.title) && <RichTitle text={T(s.title)} className="xs-svc-title" />}
      </div>
      <div className="xs-rows">
        {items.map((it, i) => (
          <div className="xs-row" key={it.id}>
            <div className="xs-row-title">
              <span className="xs-label xs-mute">{pad2(i)}</span>
              <Display text={T(it.label)} />
            </div>
            <div className="xs-row-desc">
              <p className="xs-body">{T(it.text)}</p>
              <span className="xs-label">{T(it.meta)}</span>
            </div>
            <div className="xs-row-act">
              <span className="xs-label xs-mute">{T(it.value)}</span>
              {T(s.cta) && (
                <span className="xs-label" style={{ display: "inline-flex", alignItems: "center", gap: "0.6cqmin" }}>
                  <CornerDownRight style={{ width: "1em", height: "1em" }} />
                  {T(s.cta)}
                </span>
              )}
            </div>
            {it.image !== undefined && <SlideImage src={it.image} className="xs-row-img" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Gallery({ s, T }: LayoutProps) {
  const items = (s.items ?? []).slice(0, 6);
  const cols = Math.min(Math.max(items.length, 1), 3);
  return (
    <div className="xs-pad xs-gallery" style={{ "--cols": cols } as CSSProperties}>
      <div className="xs-gal-head">
        <Display text={T(s.title)} />
        {T(s.body) && <p className="xs-body"><Rich text={T(s.body)} /></p>}
      </div>
      <div className="xs-rule" />
      <div className="xs-label xs-mute">
        {T(s.eyebrow) || "Items"}: <b style={{ color: "var(--ink)" }}>{items.length}</b>
      </div>
      <div className="xs-cards">
        {items.map((it) => (
          <div className="xs-card" key={it.id}>
            <SlideImage src={it.image}>{T(it.meta) && <span className="xs-pill xs-label">{T(it.meta)}</span>}</SlideImage>
            <span className="xs-label xs-mute" style={{ textTransform: "none" }}>{T(it.value)}</span>
            <span className="xs-card-title">{T(it.label)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Split({ s, T }: LayoutProps) {
  const items = (s.items ?? []).slice(0, 3);
  return (
    <div className="xs-pad xs-split" style={{ "--cols": Math.max(items.length, 1) } as CSSProperties}>
      <div className="xs-split-top xs-label">
        <span>{T(s.eyebrow)}</span>
        <span>{T(s.subtitle)}</span>
      </div>
      <Display text={T(s.title)} />
      <div className="xs-cols">
        {items.map((it) => (
          <div key={it.id}>
            <h3 className="xs-h3">{T(it.label)}</h3>
            <p className="xs-body xs-mute">{T(it.text)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Statement({ s, T }: LayoutProps) {
  const pad = (
    <div className={cn("xs-pad xs-statement", s.image && "has-bg")}>
      <div className="xs-st-top xs-label">
        <span>{T(s.eyebrow)}</span>
        <span className="xs-mute">{T(s.subtitle)}</span>
      </div>
      <Display text={T(s.title)} />
      {T(s.body) && (
        <div className="xs-st-foot">
          <p className="xs-body">{T(s.body)}</p>
        </div>
      )}
    </div>
  );
  if (!s.image) return pad;
  // Photo behind the text, darkened enough to read on top of it.
  return (
    <>
      <SlideImage src={s.image} className="xs-statement-bg" />
      {pad}
    </>
  );
}

function Contact({ s, T }: LayoutProps) {
  const items = (s.items ?? []).slice(0, 5);
  return (
    <div className="xs-pad xs-contact">
      <div className="xs-ct-top">
        <span className="xs-logo">
          {T(s.eyebrow)}
          <sup>®</sup>
        </span>
        <span className="xs-ct-menu xs-label">
          Menu <span className="xs-plus" />
        </span>
      </div>
      <dl className="xs-info">
        {items.map((it) => (
          <div key={it.id}>
            <dt>{T(it.label)}</dt>
            {T(it.text) && <dd>{T(it.text)}</dd>}
          </div>
        ))}
      </dl>
      <div className="xs-ct-bottom">
        <span className="xs-label" style={{ textTransform: "none" }}>{T(s.subtitle)}</span>
        <Display text={T(s.title)} />
        <div className="xs-ct-line">
          <div className="xs-rule" />
          {T(s.cta) && <span className="xs-label">{T(s.cta)}</span>}
          <ArrowUpRight />
        </div>
      </div>
    </div>
  );
}

function ImageLayout({ s, T }: LayoutProps) {
  return (
    <div className="xs-image">
      <SlideImage src={s.image} className="xs-image-bg" />
      <div className="xs-image-shade" />
      <div className="xs-pad">
        <div className="xs-im-top xs-label">
          <span>{T(s.eyebrow)}</span>
          <span>{T(s.subtitle)}</span>
        </div>
        <Display text={T(s.title)} />
        {T(s.body) && <p className="xs-body"><Rich text={T(s.body)} /></p>}
      </div>
    </div>
  );
}

/** Title with *highlighted* words, one span per line. */
function RichTitle({ text, className }: { text: string; className: string }) {
  if (!text) return null;
  return (
    <h2 className={className}>
      {text.split("\n").map((l, i) => (
        <span key={i}>
          <Rich text={l} />
        </span>
      ))}
    </h2>
  );
}

/** Image slots with a caption line above each; empty slots stay as placeholders. */
function Slots({ images, className, style }: { images: string[]; className: string; style?: CSSProperties }) {
  return (
    <div className={className} style={style}>
      {images.map((src, i) => (
        <figure className="xs-slot" key={i}>
          <figcaption className="xs-label xs-mute">↓ {pad2(i)}</figcaption>
          <SlideImage src={src || undefined}>{!src && <FillImage name={`img${i}`} />}</SlideImage>
        </figure>
      ))}
    </div>
  );
}

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

/** Chapter: opens a session. Rule on top, title and intro left, sub-topics below, a huge number right. */
function Chapter({ s, T }: LayoutProps) {
  const items = (s.items ?? []).slice(0, 6);
  return (
    <div className="xs-pad xs-chapter">
      <div className="xs-ch-rule" />
      <div className="xs-ch-text">
        <Display text={T(s.title)} />
        {T(s.body) && <p className="xs-body"><Rich text={T(s.body)} /></p>}
      </div>
      {items.length > 0 && (
        <dl className="xs-ch-index">
          {items.map((it) => (
            <div key={it.id}>
              <dt>{T(it.value)}</dt>
              <dd>{T(it.label)}</dd>
            </div>
          ))}
        </dl>
      )}
      <span className="xs-ch-num" aria-hidden>{T(s.eyebrow)}</span>
    </div>
  );
}

/** Questions: numbered table (number, question, answer) with an optional image grid on the right. */
function Questions({ s, T }: LayoutProps) {
  const items = (s.items ?? []).slice(0, 8);
  const images = s.images ?? [];
  const heads = T(s.subtitle).split("/").map((x) => x.trim()).filter(Boolean);
  return (
    <div className={cn("xs-pad xs-questions", images.length > 0 && "has-imgs")} style={{ "--rows": Math.max(items.length, 1) } as CSSProperties}>
      <div className="xs-q-main">
        <div className="xs-q-head">
          <span className="xs-q-num">{T(s.eyebrow)}</span>
          <RichTitle text={T(s.title)} className="xs-q-title" />
        </div>
        <div className="xs-q-table">
          {heads.length > 0 && (
            <div className="xs-q-row xs-q-cols xs-label xs-mute">
              {heads.map((h, i) => (
                <span key={i}>↓ {h}</span>
              ))}
            </div>
          )}
          {items.map((it, i) => {
            const meta = T(it.meta);
            return (
              <div className="xs-q-row" key={it.id}>
                <span className="xs-q-n">{T(it.value) || i + 1}</span>
                <span className="xs-q-label">
                  {isHex(meta) && <i className="xs-swatch" style={{ background: meta }} />}
                  {T(it.label) || <span className="xs-q-blank"><FillText name={`l${i}`} /></span>}
                </span>
                {/* No answer yet: ruled lines to write on (worksheets). */}
                {T(it.text) ? <p className="xs-q-text"><Rich text={T(it.text)} /></p> : <span className="xs-q-blank"><FillText name={`q${i}`} /></span>}
              </div>
            );
          })}
        </div>
        {T(s.cta) && <p className="xs-q-foot"><Rich text={T(s.cta)} /></p>}
      </div>
      {images.length > 0 && (
        <Slots images={images.slice(0, 9)} className="xs-q-grid" style={{ "--cols": images.length > 4 ? 3 : 2 } as CSSProperties} />
      )}
    </div>
  );
}

/** Reel: number, big statement and a call line on top, a row of photos below (first one wide). */
function Reel({ s, T }: LayoutProps) {
  const images = (s.images ?? []).slice(0, 4);
  return (
    <div className="xs-pad xs-reel">
      <div className="xs-rule" />
      <div className="xs-reel-head">
        <span className="xs-reel-num">{T(s.eyebrow)}</span>
        <div className="xs-reel-words">
          <RichTitle text={T(s.title)} className="xs-reel-title" />
          {T(s.subtitle) && <p className="xs-reel-call">{T(s.subtitle)}</p>}
          {T(s.body) && <p className="xs-body"><Rich text={T(s.body)} /></p>}
        </div>
      </div>
      {images.length > 0 && (
        <Slots
          images={images}
          className="xs-reel-imgs"
          style={{ gridTemplateColumns: images.length > 1 ? `2fr repeat(${images.length - 1}, 1fr)` : "1fr" }}
        />
      )}
    </div>
  );
}

/** Moodboard: dense mosaic of up to 9 photos (fixed tiles), labels and a short brief on top. */
function Moodboard({ s, T }: LayoutProps) {
  const images = (s.images ?? []).slice(0, 9);
  return (
    <div className="xs-pad xs-moodboard">
      <div className="xs-mb-head">
        <div className="xs-mb-col">
          <span className="xs-label xs-mute">↓ {T(s.eyebrow)}</span>
          <RichTitle text={T(s.title)} className="xs-mb-title" />
        </div>
        <div className="xs-mb-col">
          <span className="xs-label xs-mute">↓ {T(s.subtitle)}</span>
          {T(s.body) && <p className="xs-body"><Rich text={T(s.body)} /></p>}
        </div>
      </div>
      <div className="xs-rule" />
      <Slots images={images} className="xs-mb-grid" />
    </div>
  );
}

const LAYOUT_COMPONENTS: Record<Slide["layout"], (p: LayoutProps) => React.ReactElement> = {
  aura: Aura,
  cover: Cover,
  stats: Stats,
  services: Services,
  gallery: Gallery,
  split: Split,
  statement: Statement,
  contact: Contact,
  image: ImageLayout,
  chapter: Chapter,
  questions: Questions,
  reel: Reel,
  moodboard: Moodboard,
  lyrics: Lyrics,
  "pitch-cover": PitchCover,
  "pitch-statement": PitchStatement,
  "pitch-numbers": PitchNumbers,
  "pitch-feature": PitchFeature,
  "pitch-toc": PitchToc,
  "pitch-split": PitchSplit,
  "pitch-team": PitchTeam,
};

/** Fixed-ratio frame for previews and thumbnails. */
export function SlideFrame({ className, ratio = "16 / 9", ...props }: Props & { ratio?: string }) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-lg border border-border", className)} style={{ aspectRatio: ratio }}>
      <div className="absolute inset-0">
        <SlideView {...props} />
      </div>
    </div>
  );
}
