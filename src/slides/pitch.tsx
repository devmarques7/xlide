import { ArrowDownLeft, ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import type { LText, Slide } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLook } from "./look";
import { Rich } from "./rich";
import { SlideImage } from "./slide-image";
import "./pitch.css";

/* "Investor Pitch" template: heavy uppercase titles top-left, a meta line
   top-right, ↗ bottom-left, footnote with a short rule, ↘ list markers,
   black & white photography and one attention colour. */

export type PitchProps = { s: Slide; T: (v: LText | undefined) => string };

const pad2 = (n: number) => String(n + 1).padStart(2, "0");
const imagesOf = (s: Slide) => [s.image, ...(s.images ?? [])].filter((x): x is string => !!x);

function Title({ text }: { text: string }) {
  if (!text) return null;
  return (
    <h2 className="pt-title">
      {text.split("\n").map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </h2>
  );
}

function Meta() {
  const look = useLook();
  return (
    <div className="pt-meta">
      <span className="pt-dot" />
      <span>{look.company || "Company Name"}</span>
      <span>{look.deckTitle || "Pitch Deck"}</span>
    </div>
  );
}

function Footnote({ text, side = "right" }: { text: string; side?: "left" | "right" }) {
  if (!text) return null;
  return (
    <p className={cn("pt-foot", side === "left" && "pt-foot-left")}>
      <Rich text={text} />
    </p>
  );
}

function Corner() {
  return <ArrowUpRight className="pt-corner" strokeWidth={1.4} />;
}

function Bullet({ value, text }: { value?: string; text?: string }) {
  return (
    <div className="pt-bullet">
      <ArrowDownRight className="pt-arrow" strokeWidth={1.6} />
      <div>
        {value && <strong className="pt-bullet-value"><Rich text={value} /></strong>}
        {text && <span className="pt-bullet-text"><Rich text={text} /></span>}
      </div>
    </div>
  );
}

function Lead({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <p className={cn("pt-lead", className)}>
      <Rich text={text} />
    </p>
  );
}

export function PitchCover({ s, T }: PitchProps) {
  const img = imagesOf(s)[0];
  return (
    <div className="pt pt-cover">
      <Title text={T(s.title)} />
      <ArrowDownLeft className="pt-corner-tr" strokeWidth={1.4} />
      <p className="pt-cover-desc pt-a"><Rich text={T(s.body)} /></p>
      <p className="pt-cover-sub pt-a"><Rich text={T(s.subtitle)} /></p>
      {img !== undefined && <SlideImage src={img} className="pt-cover-img pt-a pt-photo" />}
      <span className="pt-brand">{T(s.eyebrow)}</span>
    </div>
  );
}

export function PitchNumbers({ s, T }: PitchProps) {
  const items = (s.items ?? []).slice(0, 4);
  return (
    <div className="pt pt-numbers" style={{ "--n": items.length } as CSSProperties}>
      <Meta />
      <Title text={T(s.title)} />
      <div className="pt-steps">
        {items.map((it, i) => (
          <div key={it.id} className="pt-step" style={{ "--i": i } as CSSProperties}>
            <span className="pt-num">{T(it.value) || pad2(i)}</span>
            <div className="pt-step-text">
              <span><Rich text={T(it.text) || T(it.label)} /></span>
              <ArrowUpRight className="pt-step-arrow" strokeWidth={1.6} />
            </div>
          </div>
        ))}
      </div>
      <Footnote text={T(s.cta)} side="left" />
    </div>
  );
}

export function PitchFeature({ s, T }: PitchProps) {
  const items = (s.items ?? []).slice(0, 4);
  const imgs = imagesOf(s);
  const variant = s.variant === "row" || s.variant === "collage" ? s.variant : imgs.length >= 3 ? "collage" : "side";
  return (
    <div className={cn("pt pt-feature", `pt-v-${variant}`)} style={{ "--n": Math.max(items.length, 1) } as CSSProperties}>
      <Meta />
      <Title text={T(s.title)} />
      <Lead text={T(s.subtitle)} className="pt-feature-lead pt-a" />
      <div className="pt-features pt-a">
        {items.map((it) => (
          <Bullet key={it.id} value={T(it.value)} text={T(it.label) || T(it.text)} />
        ))}
      </div>
      <div className="pt-gallery pt-a">
        {(variant === "side" ? imgs.slice(0, 1) : imgs.slice(0, 3)).map((src, i) => (
          <SlideImage key={i} src={src} className="pt-photo" />
        ))}
        {imgs.length === 0 && <SlideImage className="pt-photo" />}
      </div>
      {variant === "row" ? <ArrowUpRight className="pt-row-arrow" strokeWidth={1.4} /> : <Corner />}
      <Footnote text={T(s.cta)} />
    </div>
  );
}

export function PitchToc({ s, T }: PitchProps) {
  const items = (s.items ?? []).slice(0, 14);
  return (
    <div className="pt pt-toc">
      <Meta />
      <Title text={T(s.title)} />
      <ol className="pt-toc-list pt-a" style={{ "--rows": Math.ceil(items.length / 2) } as CSSProperties}>
        {items.map((it, i) => (
          <li key={it.id}>
            <b>{pad2(i)}</b>
            <span>{T(it.label)}</span>
          </li>
        ))}
      </ol>
      <Corner />
    </div>
  );
}

export function PitchSplit({ s, T }: PitchProps) {
  const items = (s.items ?? []).slice(0, 4);
  const img = imagesOf(s)[0];
  const right = s.variant === "right";
  return (
    <div className={cn("pt pt-split", right ? "pt-v-right" : "pt-v-left")}>
      <Meta />
      <Title text={T(s.title)} />
      <Lead text={T(s.subtitle)} className="pt-split-lead pt-a" />
      <div className="pt-split-items pt-a">
        {items.map((it) => (
          <Bullet key={it.id} value={T(it.value)} text={T(it.text) || T(it.label)} />
        ))}
      </div>
      <SlideImage src={img} className="pt-split-img pt-a pt-photo" />
      <Corner />
      <Footnote text={T(s.cta)} side={right ? "left" : "right"} />
    </div>
  );
}

export function PitchTeam({ s, T }: PitchProps) {
  const items = (s.items ?? []).slice(0, 5);
  return (
    <div className="pt pt-team" style={{ "--n": Math.max(items.length, 1) } as CSSProperties}>
      <Meta />
      <Title text={T(s.title)} />
      <Lead text={T(s.subtitle)} className="pt-team-lead pt-a" />
      <div className="pt-people pt-a">
        {items.map((it) => (
          <figure key={it.id} className="pt-person">
            <SlideImage src={it.image} className="pt-photo" />
            <figcaption>
              <strong>{T(it.label)}</strong>
              <span>{T(it.text)}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <Corner />
      <Footnote text={T(s.cta)} />
    </div>
  );
}

/** Statement: heavy label title, one big sentence, optional side text (e.g. a Bible verse). */
export function PitchStatement({ s, T }: PitchProps) {
  const title = T(s.title).trim();
  const lead = T(s.subtitle);
  const body = T(s.body);
  // Nothing to show: an intentionally blank (e.g. dark) pause slide.
  if (!title && !lead.trim() && !body) return <div className="pt" />;
  return (
    <div className={cn("pt pt-statement", !title && "pt-solo", body && "pt-has-body")}>
      <Meta />
      <Title text={title} />
      {lead.trim() && (
        <p className="pt-statement-lead pt-a">
          {lead.split("\n").map((l, i) => (
            <span key={i}>
              <Rich text={l} />
            </span>
          ))}
        </p>
      )}
      {body && (
        <p className="pt-statement-body pt-a">
          <ArrowDownRight className="pt-arrow" strokeWidth={1.6} />
          <span><Rich text={body} /></span>
        </p>
      )}
      <Corner />
      <Footnote text={T(s.cta)} />
    </div>
  );
}
