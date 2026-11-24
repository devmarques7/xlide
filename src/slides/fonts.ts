/** Loads a web font family once: Fontshare for the families it hosts, Google Fonts otherwise. */
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

export function loadFont(family?: string) {
  if (!family || typeof document === "undefined") return;
  const id = "brf-" + family.replace(/\s+/g, "-");
  if (document.getElementById(id)) return;
  const l = document.createElement("link");
  l.id = id;
  l.rel = "stylesheet";
  const fs = FONTSHARE[family];
  l.href = fs
    ? `https://api.fontshare.com/v2/css?f[]=${fs}@300,400,500,600,700&display=swap`
    : `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(l);
}
