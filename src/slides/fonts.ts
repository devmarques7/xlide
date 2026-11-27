/** Loads a web font family once: imported by the team (xlide.v2.fonts) → @font-face; Fontshare for the
 *  families it hosts; Google Fonts otherwise, falling back to Fontshare and then Fontsource (jsDelivr). */
const FONTSHARE: Record<string, string> = {
  "General Sans": "general-sans",
  Satoshi: "satoshi",
  Switzer: "switzer",
  "Cabinet Grotesk": "cabinet-grotesk",
  "Clash Display": "clash-display",
  "Clash Grotesk": "clash-grotesk",
  Supreme: "supreme",
  Erode: "erode",
  Gambetta: "gambetta",
};
/** The four house fonts of song slides; anything else is a family name. */
export const HOUSE_FONTS = ["grotesk", "serif", "condensed", "mono"];

type Custom = { family: string; url: string; weight?: number };
function customFonts(): Custom[] {
  try {
    return (JSON.parse(localStorage.getItem("xlide.v2.fonts") || "{}").custom as Custom[]) || [];
  } catch {
    return [];
  }
}
const slug = (f: string) => f.toLowerCase().trim().replace(/\s+/g, "-");

export function loadFont(family?: string) {
  if (!family || typeof document === "undefined" || HOUSE_FONTS.includes(family)) return;
  const id = "brf-" + family.replace(/\s+/g, "-");
  if (document.getElementById(id)) return;
  const own = customFonts().find((f) => f.family.toLowerCase() === family.toLowerCase());
  if (own) {
    const st = document.createElement("style");
    st.id = id;
    st.textContent = `@font-face{font-family:"${own.family.replace(/"/g, "")}";src:url("${own.url}");font-weight:${own.weight || 400};font-display:swap}`;
    document.head.appendChild(st);
    return;
  }
  const fs = FONTSHARE[family];
  const urls = fs
    ? [`https://api.fontshare.com/v2/css?f[]=${fs}@300,400,500,600,700&display=swap`]
    : [
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@300;400;500;600;700;800&display=swap`,
        `https://api.fontshare.com/v2/css?f[]=${slug(family)}@300,400,500,600,700&display=swap`,
        `https://cdn.jsdelivr.net/npm/@fontsource/${slug(family)}@latest/index.css`,
      ];
  const tryAt = (k: number) => {
    if (k >= urls.length) return;
    const l = document.createElement("link");
    l.id = id;
    l.rel = "stylesheet";
    l.href = urls[k];
    l.onerror = () => {
      l.remove();
      tryAt(k + 1);
    };
    document.head.appendChild(l);
  };
  tryAt(0);
}
