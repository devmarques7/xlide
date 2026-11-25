/* XLIDE v2 · casca do mockup: barra de navegação do protótipo, tab bar, ícones, tema. */
(function () {
  const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">${d}</svg>`;
  const I = {
    home: P('<path d="M3 11 12 4l9 7v9H3z"/><path d="M9 20v-6h6v6"/>'),
    list: P('<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>'),
    lib: P('<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 4 1-3 14-4-1z"/>'),
    live: P('<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>'),
    team: P('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>'),
    play: P('<path d="M7 4v16l13-8z" fill="currentColor"/>'),
    pause: P('<path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor"/>'),
    next: P('<path d="M5 4v16l10-8zM19 4v16"/>'),
    prev: P('<path d="M19 4v16L9 12zM5 4v16"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'),
    search: P('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    grip: P('<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3"/>'),
    chev: P('<path d="m9 6 6 6-6 6"/>'),
    back: P('<path d="m15 6-6 6 6 6"/>'),
    screen: P('<rect x="3" y="4" width="18" height="12"/><path d="M8 20h8M12 16v4"/>'),
    qr: P('<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>'),
    music: P('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    check: P('<path d="m5 12 5 5 9-10"/>'),
    alert: P('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
    wifi: P('<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01"/>'),
    doc: P('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>'),
    more: P('<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>'),
    lock: P('<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    x: P('<path d="M6 6l12 12M18 6 6 18"/>'),
    stop: P('<rect x="6" y="6" width="12" height="12" fill="currentColor"/>'),
  };

  const SCREENS = [
    ["index.html", "Mapa"], ["entrar.html", "Entrar"], ["inicio.html", "Início"], ["programa.html", "Programa"],
    ["biblioteca.html", "Biblioteca"], ["musica.html", "Música"], ["console.html", "Console"], ["tela.html", "Tela"],
    ["ao-vivo.html", "Ao vivo"], ["relatorio.html", "Relatório"], ["equipe.html", "Equipe"], ["componentes.html", "Componentes"],
  ];
  const TABS = [["inicio", "inicio.html", "Início", "home"], ["programa", "programa.html", "Programa", "list"], ["biblioteca", "biblioteca.html", "Biblioteca", "lib"], ["console", "console.html", "Ao vivo", "live"], ["equipe", "equipe.html", "Equipe", "team"]];

  // tema
  const saved = (() => { try { return localStorage.getItem("xlide.v2.theme"); } catch { return null; } })();
  if (saved) document.documentElement.dataset.theme = saved;
  function toggleTheme() {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const nx = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nx;
    try { localStorage.setItem("xlide.v2.theme", nx); } catch {}
  }

  function mkBar() {
    if (document.body.dataset.nomk != null) return;
    const here = location.pathname.split("/").pop() || "index.html";
    const bar = document.createElement("nav");
    bar.className = "mk";
    bar.innerHTML = `<b>XLIDE v2 · mockup</b>` +
      SCREENS.map(([f, n]) => `<a href="${f}" class="${f === here ? "on" : ""}">${n}</a>`).join("") +
      `<span class="sp"></span>` +
      (window.LIVE ? `<span>velocidade</span>${[1, 10, 60].map((x) => `<button data-sp="${x}">×${x}</button>`).join("")}<button data-reset>reiniciar culto</button>` : "") +
      `<button data-theme-t>◐ tema</button>`;
    document.body.prepend(bar);
    bar.querySelector("[data-theme-t]").onclick = toggleTheme;
    if (window.LIVE) {
      bar.querySelectorAll("[data-sp]").forEach((b) => (b.onclick = () => LIVE.cmd.speed(+b.dataset.sp)));
      bar.querySelector("[data-reset]").onclick = () => LIVE.cmd.reset();
      LIVE.on((s) => bar.querySelectorAll("[data-sp]").forEach((b) => b.classList.toggle("on", +b.dataset.sp === s.clock.speed)));
    }
  }

  function tabbar() {
    const tab = document.body.dataset.tab;
    if (!tab) return;
    document.body.classList.add("has-tabs");
    const nav = document.createElement("nav");
    nav.className = "tabbar";
    nav.innerHTML = TABS.map(([k, f, n, ic]) => `<a href="${f}" class="${k === tab ? "on" : ""}">${I[ic]}<span>${n}</span></a>`).join("");
    document.body.append(nav);
  }

  // helpers usados pelas telas
  const person = (id) => XL.people[id] || { name: "—", ini: "?" };
  const who = (id) => `<span class="row" style="gap:6px"><span class="avatar" style="width:22px;height:22px;font-size:10px">${person(id).ini}</span>${person(id).name.split(" ")[0]}</span>`;
  const ty = (k) => `<span class="ty" data-k="${k}"><i></i>${XL.types[k].name}</span>`;
  const min = (s) => `${Math.round(s / 60)} min`;
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => [...el.querySelectorAll(s)];

  function sheet(html) {
    let sc = qs(".scrim"), sh = qs(".sheet");
    if (!sh) {
      sc = document.createElement("div"); sc.className = "scrim";
      sh = document.createElement("aside"); sh.className = "sheet";
      document.body.append(sc, sh);
      sc.onclick = closeSheet;
    }
    sh.innerHTML = `<div class="handle"></div>` + html;
    requestAnimationFrame(() => document.body.classList.add("sheet-open"));
    return sh;
  }
  function closeSheet() { document.body.classList.remove("sheet-open"); }

  const set = (sel, html) => { const el = typeof sel === "string" ? qs(sel) : sel; if (el && el._h !== html) { el._h = html; el.innerHTML = html; } };
  window.UI = { I, set, person, who, ty, min, qs, qsa, sheet, closeSheet, toggleTheme };
  document.addEventListener("DOMContentLoaded", () => { mkBar(); tabbar(); });
})();
