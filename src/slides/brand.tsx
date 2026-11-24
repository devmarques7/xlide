import { useEffect, type CSSProperties, type ReactNode } from "react";
import { ICONS } from "@/lib/icons";
import type { LText, Slide } from "@/lib/types";
import { cn } from "@/lib/utils";
import { onAccent, useLook } from "./look";
import { Rich } from "./rich";
import { SlideImage } from "./slide-image";
import "./brand.css";

/* "Brand Guidelines" template (white label): a quiet header on every page,
   big grotesk titles, section dividers with one oversized arc, colour,
   type and stationery specimens. Empty image slots show what goes there,
   so the deck can be filled in later. */

export type BrandProps = { s: Slide; T: (v: LText | undefined) => string };

const pad2 = (n: number) => String(n + 1).padStart(2, "0");
const imagesOf = (s: Slide) => [s.image, ...(s.images ?? [])];

function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((l, i) => (
        <span key={i}>
          <Rich text={l || " "} />
        </span>
      ))}
    </>
  );
}

/** Logo mark + company on the left, deck title on the right. */
function Header({ s, T }: BrandProps) {
  const look = useLook();
  return (
    <div className="br-head">
      <span className="br-brand">
        <span className="br-mark" />
        {look.company || "Brand"}
      </span>
      <span className="br-head-mid">{T(s.eyebrow)}</span>
      <span>{look.deckTitle || "Brand Guidelines"}</span>
    </div>
  );
}

/** Image slot: shows the photo, or a labelled placeholder until one is added. */
function Slot({ src, label, className }: { src?: string; label: string; className?: string }) {
  return (
    <SlideImage src={src} className={cn("br-slot", className)}>
      {!src && <span className="br-slot-label">{label}</span>}
    </SlideImage>
  );
}

function Title({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <h2 className={cn("br-title", className)}>
      <Lines text={text} />
    </h2>
  );
}

function Body({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <p className={cn("br-body", className)}>
      <Rich text={text} />
    </p>
  );
}

/** Loads a Google Fonts family once, for type specimens. */
function useFont(family?: string) {
  useEffect(() => {
    if (!family) return;
    const id = "brf-" + family.replace(/\s+/g, "-");
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id;
    l.rel = "stylesheet";
    l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@300;400;500;600;700;800&display=swap`;
    document.head.appendChild(l);
  }, [family]);
}
const fontStyle = (family?: string): CSSProperties | undefined => (family ? { fontFamily: `"${family}", var(--font-sans)` } : undefined);

function Arc({ className }: { className?: string }) {
  return <span className={cn("br-arc", className)} aria-hidden />;
}

/* ───────── layouts ───────── */

export function BrandCover({ s, T }: BrandProps) {
  const look = useLook();
  return (
    <div className="br br-cover">
      <Arc />
      <span className="br-brand br-cover-brand">
        <span className="br-mark" />
        {T(s.eyebrow) || look.company || "Brand"}
      </span>
      <span className="br-code" aria-hidden />
      <Title text={T(s.title) || "Brand\nGuidelines"} className="br-cover-title" />
      <p className="br-cover-meta">
        <Lines text={T(s.subtitle)} />
      </p>
      <p className="br-cover-date">
        <Lines text={T(s.cta)} />
      </p>
    </div>
  );
}

export function BrandWelcome({ s, T }: BrandProps) {
  return (
    <div className="br br-welcome">
      <Header s={s} T={T} />
      <Title text={T(s.title)} className="br-welcome-title" />
      <Body text={T(s.body)} className="br-welcome-body" />
      <span className="br-welcome-disc" aria-hidden />
      <Slot src={s.image} label="Retrato" className="br-welcome-img" />
    </div>
  );
}

export function BrandIndex({ s, T }: BrandProps) {
  const items = (s.items ?? []).slice(0, 8);
  return (
    <div className="br br-index">
      <Header s={s} T={T} />
      <Title text={T(s.title) || "Index"} className="br-index-title" />
      <ol className="br-index-list" style={{ "--rows": Math.ceil(items.length / 2) } as CSSProperties}>
        {items.map((it, i) => (
          <li key={it.id}>
            <span className="br-index-ico" />
            <span className="br-index-num">{T(it.value) || pad2(i)}</span>
            <strong>{T(it.label)}</strong>
            <span className="br-index-text">{T(it.text)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function BrandSection({ s, T }: BrandProps) {
  const variant = s.variant ?? "arc";
  return (
    <div className={cn("br br-section", `br-v-${variant}`)}>
      <Header s={{ ...s, eyebrow: undefined }} T={T} />
      {variant === "arc" && <Arc className="br-section-arc" />}
      {variant === "orb" && <span className="br-orb" aria-hidden />}
      {variant === "image" && <Slot src={s.image} label="Imagem de fundo" className="br-section-img" />}
      <div className="br-section-label">
        <span className="br-section-num">{T(s.eyebrow) || "01"}</span>
        <Title text={T(s.title)} className="br-section-title" />
      </div>
    </div>
  );
}

export function BrandNumbers({ s, T }: BrandProps) {
  const items = (s.items ?? []).slice(0, 4);
  return (
    <div className="br br-numbers">
      <Header s={s} T={T} />
      <Title text={T(s.title)} className="br-numbers-title" />
      <Body text={T(s.body)} className="br-numbers-body" />
      <Slot src={s.image} label="Ícone / ilustração" className="br-numbers-img" />
      <div className="br-numbers-grid" style={{ "--n": Math.max(items.length, 1) } as CSSProperties}>
        {items.map((it) => (
          <div key={it.id} className="br-stat">
            <strong>{T(it.value)}</strong>
            <span>{T(it.label)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrandAbout({ s, T }: BrandProps) {
  const items = (s.items ?? []).slice(0, 2);
  const imgs = imagesOf(s);
  return (
    <div className="br br-about">
      <Header s={s} T={T} />
      <Title text={T(s.title)} className="br-about-title" />
      <Body text={T(s.body)} className="br-about-body" />
      <div className="br-about-row">
        {items[0] && (
          <div className="br-stat br-stat-accent">
            <strong>{T(items[0].value)}</strong>
            <span>{T(items[0].label)}</span>
          </div>
        )}
        <Slot src={imgs[0]} label="Foto 1" />
        {items[1] && (
          <div className="br-stat">
            <strong>{T(items[1].value)}</strong>
            <span>{T(items[1].label)}</span>
          </div>
        )}
        <Slot src={imgs[1]} label="Foto 2" />
      </div>
    </div>
  );
}

export function BrandMission({ s, T }: BrandProps) {
  const items = (s.items ?? []).slice(0, 2);
  return (
    <div className="br br-mission">
      <Header s={s} T={T} />
      {items.map((it, i) => (
        <div key={it.id} className={cn("br-mission-col", i === 1 && "br-mission-right")}>
          <span className="br-kicker">{T(it.label)}</span>
          <p>
            <Rich text={T(it.text)} />
          </p>
        </div>
      ))}
      <Slot src={s.image} label="Símbolo" className="br-mission-logo" />
    </div>
  );
}

export function BrandFeature({ s, T }: BrandProps) {
  const right = s.variant === "right";
  return (
    <div className={cn("br br-feature", right ? "br-v-right" : "br-v-left")}>
      <Header s={s} T={T} />
      <Slot src={s.image} label="Foto" className="br-feature-img" />
      <Title text={T(s.title)} className="br-feature-title" />
      <Body text={T(s.body)} className="br-feature-body" />
      {T(s.cta) && <span className="br-tag">{T(s.cta)}</span>}
    </div>
  );
}

export function BrandPalette({ s, T }: BrandProps) {
  const items = (s.items ?? []).slice(0, 8);
  return (
    <div className="br br-palette">
      <Header s={s} T={T} />
      <Title text={T(s.title)} className="br-small-title" />
      <div className="br-palette-grid" data-n={items.length}>
        {items.map((it) => {
          const hex = T(it.value) || "#cccccc";
          return (
            <div key={it.id} className="br-swatch" style={{ "--c": hex, color: onAccent(hex) } as CSSProperties}>
              <strong>{T(it.label)}</strong>
              <span>
                {hex.toUpperCase()}
                {T(it.text) && <> · {T(it.text)}</>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BrandUsage({ s, T }: BrandProps) {
  const items = (s.items ?? []).slice(0, 9);
  return (
    <div className="br br-usage">
      <Header s={s} T={T} />
      <Title text={T(s.title)} className="br-small-title" />
      <Body text={T(s.body)} className="br-usage-body" />
      <div className="br-usage-grid">
        {items.map((it) => (
          <div key={it.id} className="br-swatch" style={{ "--c": T(it.value) || "#cccccc", color: onAccent(T(it.value) || "#cccccc") } as CSSProperties}>
            <strong className="br-usage-pct">{T(it.label)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = [100, 80, 60, 40, 20, 10];
export function BrandTones({ s, T }: BrandProps) {
  const items = (s.items ?? []).slice(0, 6);
  return (
    <div className="br br-tones">
      <Header s={s} T={T} />
      <Title text={T(s.title)} className="br-small-title" />
      <div className="br-tones-table" style={{ "--rows": Math.max(items.length, 1) } as CSSProperties}>
        <span />
        {STEPS.map((p) => (
          <span key={p} className="br-tones-head">
            {p}%
          </span>
        ))}
        {items.map((it) => (
          <TonesRow key={it.id} name={T(it.label)} hex={T(it.value) || "#cccccc"} />
        ))}
      </div>
    </div>
  );
}
function TonesRow({ name, hex }: { name: string; hex: string }) {
  return (
    <>
      <span className="br-tones-name">{name}</span>
      {STEPS.map((p) => (
        <span key={p} className="br-tone" style={{ background: `color-mix(in srgb, ${hex} ${p}%, white)` }} />
      ))}
    </>
  );
}

export function BrandTypeface({ s, T }: BrandProps) {
  useFont(s.font);
  const items = (s.items ?? []).slice(0, 6);
  return (
    <div className="br br-typeface">
      <Header s={s} T={T} />
      <h2 className="br-typeface-name" style={fontStyle(s.font)}>
        {T(s.title) || s.font || "Typeface"}
      </h2>
      <Body text={T(s.subtitle)} className="br-typeface-role" />
      <p className="br-typeface-abc" style={fontStyle(s.font)}>
        {T(s.body) || "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 !?&@#%"}
      </p>
      <ul className="br-weights" style={fontStyle(s.font)}>
        {items.map((it) => (
          <li key={it.id} style={{ fontWeight: Number(T(it.value)) || 400 }}>
            <span>{T(it.label)}</span>
            <span>Aa</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BrandGlyphs({ s, T }: BrandProps) {
  useFont(s.font);
  return (
    <div className="br br-glyphs">
      <Header s={s} T={T} />
      <h2 className="br-glyphs-name" style={fontStyle(s.font)}>
        {T(s.title) || s.font || "Typeface"}
      </h2>
      <p className="br-glyphs-set" style={fontStyle(s.font)}>
        {T(s.body) || "Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm\nNn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz\n0123456789 (!?.,:;&@#$€%*)"}
      </p>
      <span className="br-glyphs-big" style={fontStyle(s.font)}>
        {T(s.cta) || "%*"}
      </span>
      <Body text={T(s.subtitle)} className="br-glyphs-role" />
    </div>
  );
}

export function BrandHierarchy({ s, T }: BrandProps) {
  const items = (s.items ?? []).slice(0, 6);
  return (
    <div className="br br-hierarchy">
      <Header s={s} T={T} />
      <Title text={T(s.title)} className="br-small-title" />
      <div className="br-levels">
        {items.map((it, i) => (
          <div key={it.id} className="br-level" style={{ "--lv": i } as CSSProperties}>
            <span className="br-level-spec">{T(it.value)}</span>
            <span className="br-level-text">{T(it.label)}</span>
          </div>
        ))}
      </div>
      <Slot src={s.image} label="Símbolo / ilustração" className="br-hierarchy-img" />
    </div>
  );
}

export function BrandText({ s, T }: BrandProps) {
  return (
    <div className="br br-text">
      <Header s={s} T={T} />
      <p className="br-text-lead">
        <Lines text={T(s.title)} />
      </p>
      <p className="br-text-cols">
        <Rich text={T(s.body)} />
      </p>
      <p className="br-text-side">
        <Rich text={T(s.subtitle)} />
      </p>
      {T(s.cta) && <span className="br-tag br-text-tag">{T(s.cta)}</span>}
    </div>
  );
}

export function BrandIcons({ s, T }: BrandProps) {
  const items = s.items ?? [];
  const cells: ReactNode[] = items.length
    ? items.slice(0, 24).map((it) => {
        const Icon = it.icon ? ICONS[it.icon] : undefined;
        return (
          <div key={it.id} className="br-icon">
            {Icon ? <Icon strokeWidth={1.4} /> : <span className="br-icon-ph" />}
            <span>{T(it.label)}</span>
          </div>
        );
      })
    : Array.from({ length: 24 }, (_, i) => (
        <div key={i} className="br-icon">
          <span className="br-icon-ph" />
        </div>
      ));
  return (
    <div className="br br-icons">
      <Header s={s} T={T} />
      <Title text={T(s.title)} className="br-small-title" />
      <div className="br-icons-grid">{cells}</div>
    </div>
  );
}

const MOCKUP_SLOTS: Record<string, string[]> = {
  card: ["Cartão · frente", "Cartão · verso"],
  letterhead: ["Papel timbrado", "Página 2"],
  envelope: ["Envelope · frente", "Envelope · verso"],
  devices: ["Tela grande", "Celular", "Tablet"],
  social: ["Post 1", "Post 2", "Post 3"],
};
export function BrandMockup({ s, T }: BrandProps) {
  const variant = s.variant && MOCKUP_SLOTS[s.variant] ? s.variant : "card";
  const imgs = imagesOf(s);
  return (
    <div className={cn("br br-mockup", `br-m-${variant}`)}>
      <Header s={s} T={T} />
      <Title text={T(s.title)} className="br-small-title" />
      <Body text={T(s.body)} className="br-mockup-body" />
      <div className="br-mockup-stage">
        {MOCKUP_SLOTS[variant].map((label, i) => (
          <Slot key={i} src={imgs[i]} label={label} className={`br-mockup-slot br-ms-${i}`} />
        ))}
      </div>
    </div>
  );
}
