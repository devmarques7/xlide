import {
  ArrowUpRight, Contrast, Grid3x3, Languages, Play, QrCode, ScanText, Search, Smartphone, Type,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { LogoGlyph, LogoMark } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ICONS } from "@/lib/icons";
import { usePrefs } from "@/lib/prefs";
import { samplePresentations } from "@/lib/samples";
import { cn } from "@/lib/utils";
import { SlideFrame } from "@/slides/SlideView";

/* ───── mocked identity data ───── */

const COLORS = [
  { token: "paper", name: "Off-white", light: "#F1F0EC", dark: "#121211", use: "Background" },
  { token: "card", name: "Bone", light: "#F7F6F3", dark: "#1A1A19", use: "Surfaces, cards" },
  { token: "muted", name: "Fog", light: "#E6E5E0", dark: "#232322", use: "Fills, tracks" },
  { token: "line", name: "Hairline", light: "#D6D5CF", dark: "#2E2E2C", use: "Borders, rules" },
  { token: "mute-ink", name: "Off-gray", light: "#6F6E69", dark: "#8F8E89", use: "Secondary text" },
  { token: "ink", name: "Matte black", light: "#161615", dark: "#ECEBE6", use: "Text, primary" },
];

const TYPE_SCALE = [
  { name: "Display", spec: "BDO Grotesk clamp(56–208px) / 0.86 / −4.5%", cls: "display text-6xl sm:text-8xl", sample: "Xlide" },
  { name: "Heading", spec: "40px / 1.0 / −3%", cls: "text-[2.5rem] leading-none font-medium tracking-tight uppercase", sample: "Projects" },
  { name: "Title", spec: "20px / 1.2 / −1%", cls: "text-xl font-medium tracking-tight", sample: "Attention to details" },
  { name: "Body", spec: "15px / 1.45 / 0", cls: "text-[0.95rem] leading-relaxed", sample: "Real projects that show how we think, work, and solve problems." },
  { name: "Label · mono", spec: "Fragment Mono 11px / 1.45 / +2% · caps", cls: "label-xs", sample: "Items: 6 — 4K resolution" },
];

const GRID = [
  { bp: "Mobile", range: "< 640", cols: 4, gutter: 12, margin: 16, show: "grid sm:hidden" },
  { bp: "Tablet", range: "640–1023", cols: 8, gutter: 16, margin: 24, show: "hidden sm:grid lg:hidden" },
  { bp: "Desktop", range: "≥ 1024", cols: 12, gutter: 24, margin: 40, show: "hidden lg:grid" },
];

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64, 96];
const RADII = [
  { n: "button", v: 0 },
  { n: "input", v: 0 },
  { n: "card", v: 0 },
  { n: "dialog", v: 0 },
  { n: "key", v: 0 },
];
const MOTION = [
  { n: "instant", d: "75ms", e: "linear", use: "Key press" },
  { n: "quick", d: "200ms", e: "ease-out", use: "Hover, toggles" },
  { n: "page", d: "450ms", e: "cubic-bezier(.2,.7,.2,1)", use: "Slide change" },
  { n: "error", d: "450ms", e: "cubic-bezier(.36,.07,.19,.97)", use: "Passcode shake" },
];

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/* ───── layout helpers ───── */

function Section({ n, title, children, className }: { n: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-6 border-t border-border py-10 sm:py-14 lg:grid-cols-12 lg:gap-6", className)}>
      <header className="flex items-baseline gap-3 lg:col-span-3 lg:flex-col lg:gap-2">
        <span className="label-xs text-muted-foreground">{n}/</span>
        <h2 className="text-2xl font-medium tracking-tight uppercase sm:text-3xl">{title}</h2>
      </header>
      <div className="min-w-0 lg:col-span-9">{children}</div>
    </section>
  );
}

function Cell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex min-h-36 flex-col justify-between gap-6 border-border p-4 sm:p-5", className)}>{children}</div>;
}

export default function Identity() {
  const { t } = usePrefs();
  const demo = samplePresentations()[0];

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
        {/* Hero — echoes the reference: big type left, bordered key-figure grid right */}
        <section className="grid gap-8 py-10 sm:py-16 lg:grid-cols-2 lg:gap-6">
          <div className="flex flex-col justify-between gap-10">
            <span className="inline-flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-full border border-foreground">
                <LogoGlyph className="size-5" />
              </span>
              <span className="label-xs">by xlide.app</span>
            </span>
            <div>
              <h1 className="display text-[clamp(3.5rem,11vw,9rem)]">
                {t("identity.title")}
                <br />
                System
              </h1>
              <p className="mt-6 max-w-lg text-[0.95rem] leading-relaxed text-muted-foreground">{t("identity.intro")}</p>
              <Button className="mt-6" asChild>
                <a href="#colour">
                  {t("identity.colors")} <ArrowUpRight />
                </a>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border">
            <Cell className="border-r border-b">
              <Contrast className="size-5" strokeWidth={1.5} />
              <span className="label-xs">Monochrome</span>
            </Cell>
            <Cell className="border-b">
              <Grid3x3 className="size-5" strokeWidth={1.5} />
              <span className="label-xs">4 · 8 · 12 grid</span>
            </Cell>
            <Cell className="border-r">
              <span className="display text-6xl sm:text-7xl">3</span>
              <span className="label-xs">EN · PT · NL</span>
            </Cell>
            <Cell>
              <span className="display text-6xl sm:text-7xl">160%</span>
              <span className="label-xs">{t("prefs.textSize")}</span>
            </Cell>
          </div>
        </section>

        <Section n="01" title={t("identity.voice")}>
          <div className="grid overflow-hidden rounded-2xl border border-border sm:grid-cols-2">
            {[
              { icon: Type, h: t("identity.p1"), d: t("identity.p1d") },
              { icon: Contrast, h: t("identity.p2"), d: t("identity.p2d") },
              { icon: Grid3x3, h: t("identity.p3"), d: t("identity.p3d") },
              { icon: ScanText, h: t("identity.p4"), d: t("identity.p4d") },
            ].map(({ icon: Icon, h, d }, i) => (
              <Cell key={h} className={cn("border-b sm:[&:nth-child(odd)]:border-r", i >= 2 && "sm:border-b-0", i === 3 && "border-b-0")}>
                <Icon className="size-5" strokeWidth={1.5} />
                <div>
                  <h3 className="label-xs mb-2">{h}</h3>
                  <p className="text-sm text-muted-foreground">{d}</p>
                </div>
              </Cell>
            ))}
          </div>
        </Section>

        <Section n="02" title={t("identity.logo")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid aspect-square place-items-center border border-border bg-[#F1F0EC] text-[#161615]">
              <LogoGlyph className="size-28" />
            </div>
            <div className="grid aspect-square place-items-center border border-border bg-[#121211] text-[#ECEBE6]">
              <LogoGlyph className="size-28" />
            </div>
            <div className="flex aspect-square flex-col justify-between rounded-2xl border border-border p-5">
              <span className="label-xs text-muted-foreground">Wordmark</span>
              <span className="text-4xl font-semibold tracking-[0.18em]">XLIDE</span>
              <div className="flex items-end gap-3">
                {[16, 24, 32, 48].map((px) => (
                  <div key={px} className="flex flex-col items-center gap-1">
                    <span className="block" style={{ width: px, height: px }}>
                      <LogoMark className="size-full" />
                    </span>
                    <span className="text-[9px] text-muted-foreground">{px}px</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">
            A six-armed asterisk on a 100-unit grid: one flared arm rotated 0°, 60° and −60°, split by an S-shaped cut. On the square app tile the glyph fills 72% of the tile, which leaves the clear space. It follows the theme: ink on paper in light mode, paper on ink in dark mode. Files: logo.svg (adapts to the OS theme), logo-light.svg, logo-dark.svg, favicon.svg.
          </p>
        </Section>

        <Section n="03" title={t("identity.colors")} className="scroll-mt-20">
          <div id="colour" className="grid overflow-hidden rounded-2xl border border-border sm:grid-cols-2 lg:grid-cols-3">
            {COLORS.map((c, i) => (
              <div key={c.token} className={cn("flex flex-col border-border", "border-b", "sm:[&:nth-child(odd)]:border-r lg:[&:nth-child(odd)]:border-r-0 lg:[&:not(:nth-child(3n))]:border-r", i >= COLORS.length - 3 && "lg:border-b-0")}>
                <div className="grid h-28 grid-cols-2">
                  <div style={{ background: c.light }} />
                  <div style={{ background: c.dark }} />
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="label-xs text-muted-foreground">--{c.token}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.light} · {c.dark}
                  </span>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{c.use}</span>
                    <Badge variant="outline" className="font-mono normal-case">
                      {contrast(c.light, "#161615").toFixed(1)}:1
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Contrast measured against matte black ink. Body text pairs (ink on paper, off-gray on paper) are AA or better in both themes.</p>
        </Section>

        <Section n="04" title={t("identity.type")}>
          <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-border p-5 sm:flex-row sm:items-end">
            <span className="display text-[7rem] sm:text-[10rem]">Aa</span>
            <div className="text-sm sm:text-right">
              <p className="font-medium">BDO Grotesk</p>
              <p className="text-muted-foreground">Titles and text · 300–800</p>
              <p className="mt-2 font-mono">Fragment Mono</p>
              <p className="text-muted-foreground">Labels, meta and data · 400</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />abcdefghijklmnopqrstuvwxyz 0123456789 ãçéñü</p>
            </div>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {TYPE_SCALE.map((s) => (
              <li key={s.name} className="grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:items-baseline">
                <div>
                  <p className="label-xs">{s.name}</p>
                  <p className="font-mono text-[0.7rem] text-muted-foreground">{s.spec}</p>
                </div>
                <p className={cn("min-w-0 truncate", s.cls)}>{s.sample}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section n="05" title={t("identity.grid")}>
          <div className="flex flex-col gap-3">
            {GRID.map((g) => (
              <div key={g.bp} className="rounded-2xl border border-border p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {g.bp} <span className="text-muted-foreground">{g.range}px</span>
                  </span>
                  <span className="label-xs text-muted-foreground">
                    {t("identity.columns")} {g.cols} · {t("identity.gutter")} {g.gutter} · {t("identity.margin")} {g.margin}
                  </span>
                </div>
                <div className="grid h-16 gap-1.5" style={{ gridTemplateColumns: `repeat(${g.cols}, minmax(0,1fr))` }}>
                  {Array.from({ length: g.cols }).map((_, i) => (
                    <div key={i} className="rounded-[3px] bg-foreground/8 outline outline-1 -outline-offset-1 outline-foreground/15" />
                  ))}
                </div>
              </div>
            ))}
            <p className="text-sm text-muted-foreground">Live: the grid currently active on this screen.</p>
            {GRID.map((g) => (
              <div key={g.bp + "live"} className={cn("pointer-events-none h-24 gap-3 rounded-2xl", g.show)} style={{ gridTemplateColumns: `repeat(${g.cols}, minmax(0,1fr))` }}>
                {Array.from({ length: g.cols }).map((_, i) => (
                  <div key={i} className="flex items-end justify-center rounded-md bg-foreground/[0.06] pb-2 label-xs text-muted-foreground">{i + 1}</div>
                ))}
              </div>
            ))}
          </div>
        </Section>

        <Section n="06" title={`${t("identity.spacing")} · ${t("identity.radius")}`}>
          <div className="grid gap-6 lg:grid-cols-2">
            <ul className="flex flex-col gap-2">
              {SPACING.map((s) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="w-10 font-mono text-xs text-muted-foreground">{s}</span>
                  <span className="h-3 rounded-sm bg-foreground" style={{ width: s * 2.5 }} />
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {RADII.map((r) => (
                <div key={r.n} className="flex flex-col items-center gap-2">
                  <div className="aspect-square w-full border border-foreground bg-card" />
                  <span className="label-xs text-muted-foreground">
                    {r.n} · {r.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section n="07" title={t("identity.components")}>
          <div className="grid overflow-hidden rounded-2xl border border-border md:grid-cols-2">
            <Cell className="border-b md:border-r">
              <span className="label-xs text-muted-foreground">Button</span>
              <div className="flex flex-wrap gap-2">
                <Button>
                  <Play /> Present
                </Button>
                <Button variant="outline">Explore more</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost" size="icon" aria-label="QR">
                  <QrCode />
                </Button>
              </div>
            </Cell>
            <Cell className="border-b">
              <span className="label-xs text-muted-foreground">Input · Search</span>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search title, content or tag…" />
              </div>
            </Cell>
            <Cell className="border-b md:border-r">
              <span className="label-xs text-muted-foreground">Badge · Switch · Tabs</span>
              <div className="flex flex-wrap items-center gap-3">
                <Badge>Editorial</Badge>
                <Badge variant="outline">PT</Badge>
                <Badge className="bg-black/55 text-[#f1f0ec]">Fashion</Badge>
                <Switch defaultChecked aria-label="demo" />
              </div>
              <Tabs defaultValue="a">
                <TabsList className="w-full">
                  <TabsTrigger value="a">Content</TabsTrigger>
                  <TabsTrigger value="b">Design</TabsTrigger>
                  <TabsTrigger value="c">Analysis</TabsTrigger>
                </TabsList>
              </Tabs>
            </Cell>
            <Cell className="border-b">
              <span className="label-xs text-muted-foreground">Passcode key</span>
              <div className="flex gap-4">
                {[["1", ""], ["4", "GHI"], ["2", "ABC"], ["3", "DEF"]].map(([d, l]) => (
                  <span key={d} className="flex size-16 flex-col items-center justify-center rounded-full bg-foreground/[0.07]">
                    <span className="text-2xl leading-none font-light">{d}</span>
                    <span className={cn("text-[0.5rem] font-semibold tracking-[0.2em]", !l && "invisible")}>{l || "·"}</span>
                  </span>
                ))}
              </div>
            </Cell>
            <Cell className="md:col-span-2">
              <span className="label-xs text-muted-foreground">Slide · layouts</span>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {demo.slides.slice(0, 4).map((s) => (
                  <SlideFrame key={s.id} slide={s} lang="en" />
                ))}
              </div>
            </Cell>
          </div>
        </Section>

        <Section n="08" title={t("identity.icons")}>
          <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-border sm:grid-cols-6 lg:grid-cols-8">
            {[...Object.entries(ICONS), ["languages-2", Languages] as const, ["smartphone-2", Smartphone] as const].slice(0, 24).map(([name, Icon]) => (
              <div key={name} className="flex aspect-square flex-col items-center justify-center gap-2 border-r border-b border-border">
                <Icon className="size-5" strokeWidth={1.5} />
                <span className="text-[0.6rem] text-muted-foreground">{name.replace(/-2$/, "")}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Lucide, 1.5px stroke on 20–24px, 2px below 16px. Icons never carry meaning alone — always pair with a label or aria-label.</p>
        </Section>

        <Section n="09" title={t("identity.motion")} className="pb-24">
          <ul className="divide-y divide-border border-y border-border">
            {MOTION.map((m) => (
              <li key={m.n} className="grid grid-cols-2 gap-2 py-4 text-sm sm:grid-cols-4">
                <span className="font-medium">{m.n}</span>
                <span className="font-mono text-xs text-muted-foreground">{m.d}</span>
                <span className="col-span-2 font-mono text-xs text-muted-foreground sm:col-span-1">{m.e}</span>
                <span className="col-span-2 text-muted-foreground sm:col-span-1">{m.use}</span>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  );
}
