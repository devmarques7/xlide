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
    map: P('<rect x="9" y="9" width="6" height="6"/><rect x="2" y="3" width="5" height="4"/><rect x="17" y="3" width="5" height="4"/><rect x="2" y="17" width="5" height="4"/><rect x="17" y="17" width="5" height="4"/><path d="M7 5h2v4M17 5h-2v4M7 19h2v-4M17 19h-2v-4" stroke-dasharray="2 2"/>'),
    board: P('<rect x="3" y="3" width="8" height="10"/><rect x="13" y="3" width="8" height="6"/><rect x="13" y="11" width="8" height="10"/><rect x="3" y="15" width="8" height="6"/>'),
    slides: P('<rect x="3" y="5" width="18" height="11"/><path d="M7 20h10M9 9h6M9 12h4"/>'),
    present: P('<rect x="3" y="4" width="18" height="12"/><path d="M12 16v4M8 20h8M10 8l5 2-5 2z"/>'),
    arrow: P('<path d="M7 17 17 7M9 7h8v8"/>'),
    palette: P('<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8" fill="currentColor"/><rect x="3" y="13" width="8" height="8" fill="currentColor" opacity=".45"/><path d="M13 21c0-4 4-8 8-8"/>'),
    spark: P('<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><rect x="10" y="10" width="4" height="4" fill="currentColor"/>'),
    wave: P('<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2M21 12h0"/>'),
    menu: P('<path d="M4 7h16M4 12h16M4 17h10"/>'),
    cal: P('<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    folder: P('<path d="M3 6h7l2 2h9v11H3z"/>'),
    star: P('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    archive: P('<rect x="3" y="4" width="18" height="5"/><path d="M5 9v11h14V9M10 13h4"/>'),
    trash: P('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    pin: P('<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v8"/>'),
    font: P('<path d="M4 20 10 4h1l6 16M6.5 14h8"/><path d="M18 20h3"/>'),
  };

  /* Marca do XLIDE (src/components/logo.tsx): braço girado 0°, 60° e −60°, cortado em S. */
  let gid = 0;
  const ARM = "M42.5 15 L57.5 15 L55 50 L57.5 85 L42.5 85 L45 50 Z";
  function glyph(cls = "") {
    const id = "xm" + ++gid;
    return `<svg class="xglyph ${cls}" viewBox="0 0 100 100" aria-hidden="true"><defs><mask id="${id}"><g fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"><path d="${ARM}"/><path d="${ARM}" transform="rotate(60 50 50)"/><path d="${ARM}" transform="rotate(-60 50 50)"/></g><g fill="#000"><polygon points="45,35.5 92,46 92,52"/><polygon points="55,64.5 8,54 8,48"/></g></mask></defs><rect width="100" height="100" fill="currentColor" mask="url(#${id})"/></svg>`;
  }
  const mark = (cls = "") => `<span class="xmark ${cls}" aria-hidden="true">${glyph()}</span>`;

  const SCREENS = [
    ["index.html", "Mapa"], ["entrar.html", "Entrar"], ["inicio.html", "Início"], ["agenda.html", "Agenda"], ["programa.html", "Programa"],
    ["boards.html", "Boards"], ["biblioteca.html", "Biblioteca"], ["musica.html", "Música"], ["arquivos.html", "Arquivos"], ["kit.html", "Estúdio"], ["deck.html", "Deck"], ["estudio.html", "Editor"], ["console.html", "Console"], ["tela.html", "Tela"],
    ["ao-vivo.html", "Ao vivo"], ["relatorio.html", "Relatório"], ["equipe.html", "Equipe"], ["componentes.html", "Componentes"],
  ];
  /* Navegação por categoria. [chave, arquivo, nome, ícone, contador?] */
  const NAV = [
    { items: [["inicio", "inicio.html", "Início", "home"], ["arquivos", "arquivos.html", "Arquivos", "folder", "files"]] },
    { g: "Slides", d: "O que vai para a tela", items: [["songs", "biblioteca.html?tab=songs", "Músicas", "music", "songs"], ["decks", "biblioteca.html?tab=decks", "Decks", "slides", "decks"], ["avisos", "kit.html#avisos", "Fundos de avisos", "present"], ["tpl", "biblioteca.html?tab=tpl", "Modelos", "doc"]] },
    { g: "Estúdio", d: "Visual e testes", items: [["kit", "kit.html", "Fundos e fontes", "palette"], ["testar", "kit.html#testar", "Testar um slide", "spark"], ["editor", "estudio.html", "Editor de música", "wave"]] },
    { g: "Culto", d: "O sábado", items: [["agenda", "agenda.html", "Agenda", "cal"], ["programa", "programa.html", "Programa", "list"], ["console", "console.html", "Ao vivo", "live"], ["tela", "tela.html", "Tela do projetor", "screen"], ["relatorio", "relatorio.html", "Relatório", "clock"]] },
    { g: "Ideias", d: "Antes dos slides", items: [["boards", "boards.html", "Boards", "board"]] },
    { g: "Igreja", items: [["equipe", "equipe.html", "Equipe e acesso", "team"]] },
  ];
  // Celular: 6 atalhos + Criar no meio; o resto mora no Menu.
  const BAR = [["inicio", "inicio.html", "Início", "home"], ["songs", "biblioteca.html", "Slides", "slides"], ["arquivos", "arquivos.html", "Arquivos", "folder"], null, ["programa", "programa.html", "Programa", "list"], ["console", "console.html", "Ao vivo", "live"], ["menu", "#", "Menu", "menu"]];
  const SLIDE_KEYS = ["songs", "decks", "tpl", "boards"];

  /* Quem está usando (troca em "Ver como" no Início e no cartão do menu). */
  const CLOUD = !!(window.XCLOUD && XCLOUD.on && !XCLOUD.leaving);
  const me = () => { if (CLOUD && XCLOUD.uid) return XCLOUD.uid; try { return new URLSearchParams(location.search).get("as") || localStorage.getItem("xlide.v2.me") || "ana"; } catch { return "ana"; } };
  function setMe(k) { try { localStorage.setItem("xlide.v2.me", k); } catch {} }

  /* Meus arquivos: pastas + estado (pasta, status, estrela, texto) guardado neste navegador. */
  const FOLDERS = [
    ["avisos", "Avisos", "Decks de anúncios"],
    ["pregacao", "Pregação", "Slides dos sermões"],
    ["inicio", "Início do culto", "Boas-vindas e contagem"],
    ["oracao", "Oração", "Fundos e pedidos"],
    ["versiculo", "Versículos", "Leituras e textos"],
  ];
  const STATUS = [["padrao", "Padrão", "Modelos da igreja", "pin"], ["arquivado", "Arquivados", "Fora de uso, guardados", "archive"], ["lixeira", "Lixeira", "Excluídos; somem em 30 dias", "trash"]];
  const FK = "xlide.v2.files";
  const FILES = {
    FOLDERS, STATUS,
    _st() { try { return JSON.parse(localStorage.getItem(FK)) || { edit: {}, added: [], gone: [] }; } catch { return { edit: {}, added: [], gone: [] }; } },
    _save(x) { try { localStorage.setItem(FK, JSON.stringify(x)); } catch {} },
    all() { const x = this._st(); return [...x.added, ...((window.XL && XL.files) || [])].filter((f) => !x.gone.includes(f.id)).map((f) => ({ ...f, ...(x.edit[f.id] || {}) })); },
    mine(k = me()) { return this.all().filter((f) => f.owner === k || f.shared.includes(k)); },
    get(id) { return this.all().find((f) => f.id === id); },
    update(id, patch) { const x = this._st(); x.edit[id] = { ...(x.edit[id] || {}), ...patch }; this._save(x); },
    add(f) { const x = this._st(); x.added.unshift(f); this._save(x); return f; },
    destroy(id) { const x = this._st(); x.gone.push(id); x.added = x.added.filter((f) => f.id !== id); this._save(x); },
    counts(k = me()) {
      const c = {}; this.mine(k).forEach((f) => { const key = f.status === "ativo" ? f.folder : f.status; c[key] = (c[key] || 0) + 1; });
      return c;
    },
    reset() { try { localStorage.removeItem(FK); } catch {} },
  };

  // idiomas da interface (pt-BR, en, nl): carrega em toda página que usa a casca
  // importar PDF: disponível em toda página (Criar → Importar PDF)
  if (!document.querySelector('script[src$="pdf-import.js"]')) { const sc = document.createElement("script"); sc.src = "assets/pdf-import.js"; document.head.append(sc); }
  if (!document.querySelector('script[src$="i18n.js"]')) { const sc = document.createElement("script"); sc.src = "assets/i18n.js"; document.head.append(sc); }

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
    if (document.body.dataset.nomk != null || CLOUD) return;
    const here = location.pathname.split("/").pop() || "index.html";
    const bar = document.createElement("nav");
    bar.className = "mk";
    bar.innerHTML = `<b>XLIDE v2 · mockup</b>` +
      SCREENS.map(([f, n]) => `<a href="${f}" class="${f === here ? "on" : ""}">${n}</a>`).join("") +
      `<span class="sp"></span>` +
      (window.LIVE ? `<span>velocidade</span>${[1, 10, 60].map((x) => `<button data-sp="${x}">×${x}</button>`).join("")}<button data-reset>reiniciar culto</button>` : "") +
      `<button data-theme-t>◐ tema</button>`;
    document.body.prepend(bar);
    const setH = () => document.documentElement.style.setProperty("--mk-h", bar.offsetHeight + "px");
    setH(); addEventListener("resize", setH);
    bar.querySelector("[data-theme-t]").onclick = () => { toggleTheme(); window.I18N && I18N.paint(); };
    if (window.LIVE) {
      bar.querySelectorAll("[data-sp]").forEach((b) => (b.onclick = () => LIVE.cmd.speed(+b.dataset.sp)));
      bar.querySelector("[data-reset]").onclick = () => LIVE.cmd.reset();
      LIVE.on((s) => bar.querySelectorAll("[data-sp]").forEach((b) => b.classList.toggle("on", +b.dataset.sp === s.clock.speed)));
    }
  }

  /* Qual item está aceso: data-tab da página; na Biblioteca, a aba aberta. */
  function activeKey() {
    const tab = document.body.dataset.tab;
    if (tab === "biblioteca") { const t = new URLSearchParams(location.search).get("tab") || "songs"; return SLIDE_KEYS.includes(t) ? t : "songs"; }
    if (tab === "arquivos") { const p = new URLSearchParams(location.search).get("pasta"); return p ? "pasta:" + p : "arquivos"; }
    if (tab === "kit") return location.hash === "#avisos" ? "avisos" : location.hash === "#testar" ? "testar" : "kit";
    return tab;
  }
  const count = (k) => (k === "files" ? FILES.mine().filter((f) => f.status === "ativo").length : window.XL && k && XL[k] ? Object.keys(XL[k]).length : "");
  const fileItems = () => { const c = FILES.counts(); return [...FOLDERS.map(([k, n]) => ["pasta:" + k, "arquivos.html?pasta=" + k, n, "folder", c[k] || 0]), ...STATUS.map(([k, n, , ic]) => ["pasta:" + k, "arquivos.html?pasta=" + k, n, ic, c[k] || 0])]; };
  /* Grupos recolhíveis: abre sozinho o grupo da página atual; o resto lembra o que você abriu. */
  const NK = "xlide.v2.nav";
  const navOpen = () => { try { return JSON.parse(localStorage.getItem(NK)) || {}; } catch { return {}; } };
  const GRID = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg>';
  const CARET = '<svg class="sb-caret-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m8 10 4 4 4-4"/></svg>';
  const itemHTML = (on) => ([k, f, n, ic, c]) => `<a class="sb-i${k === on ? " on" : ""}" href="${f}" data-k="${k}" ${k === on ? 'aria-current="page"' : ""}>${I[ic]}<span>${n}</span>${k === "console" ? '<i class="live-dot" title="Culto ao vivo agora"></i>' : c ? `<em>${count(c)}</em>` : ""}</a>`;
  const groupsHTML = (on) => {
    const open = navOpen(), it = itemHTML(on);
    return NAV.map((G) => {
      if (!G.g) return `<div class="sb-g sb-top">${G.items.map((x) => {
        if (x[0] !== "arquivos") return it(x);
        const inFiles = on === "arquivos" || String(on).startsWith("pasta:"), o = open.Arquivos ?? inFiles;
        const kids = fileItems().map(([k, f, n, ic, c]) => `<a class="sb-i sub${k === on ? " on" : ""}${/arquivado|lixeira|padrao/.test(k) ? " st" : ""}" href="${f}" data-k="${k}">${I[ic]}<span>${n}</span><em>${c || ""}</em></a>`).join("");
        return `<div class="sb-tree${o ? " open" : ""}" data-g="Arquivos"><div class="sb-row">${it(x)}<button class="sb-caret sb-flybtn" type="button" data-fly="Arquivos" aria-label="Atalhos de Arquivos" title="Atalhos">${GRID}</button><button class="sb-caret" type="button" data-tg="Arquivos" aria-expanded="${o}" aria-label="Mostrar pastas">${CARET}</button></div><div class="sb-kids"><span class="sb-sub">Pastas</span>${kids}</div></div>`;
      }).join("")}</div>`;
      const has = G.items.some(([k]) => k === on), o = open[G.g] ?? has;
      return `<div class="sb-g${o ? " open" : ""}" data-g="${G.g}"><div class="sb-hrow"><button class="sb-h" type="button" data-fly="${G.g}" title="Atalhos de ${G.g}"><span>${G.g}</span>${has && !o ? '<i class="sb-dot"></i>' : ""}</button><button class="sb-caret" type="button" data-tg="${G.g}" aria-expanded="${o}" aria-label="Abrir ou fechar ${G.g}">${CARET}</button></div><div class="sb-kids">${G.items.map(it).join("")}</div></div>`;
    }).join("");
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tg]"); if (!t || !t.closest(".sbar, .sb-menu")) return;
    e.preventDefault();
    const g = t.closest("[data-g]"), o = !g.classList.contains("open");
    if (!g) return;
    g.classList.toggle("open", o); t.setAttribute("aria-expanded", o);
    const st = navOpen(); st[t.dataset.tg] = o; try { localStorage.setItem(NK, JSON.stringify(st)); } catch {}
  });

  function tabbar() {
    const tab = document.body.dataset.tab;
    if (!tab) return;
    const on = activeKey();
    document.body.classList.add("has-tabs");
    // desktop: menu lateral por categoria
    const side = document.createElement("nav");
    side.className = "sbar";
    side.setAttribute("aria-label", "Navegação principal");
    side.innerHTML = `<a class="sb-brand" href="${CLOUD ? "inicio.html" : "index.html"}" aria-label="XLIDE">${mark()}<span><b>XLIDE</b><small>Nova Semente Rotterdam</small></span></a>
      <button class="sb-create" type="button">${I.plus}<span>Criar</span><kbd>N</kbd></button>
      <div class="sb-scroll">${groupsHTML(on)}</div>
      <button class="sb-me" type="button" aria-label="Quem está usando: trocar de pessoa">${who_()}</button>`;
    // celular: barra preta embaixo
    const nav = document.createElement("nav");
    nav.className = "tabbar";
    nav.setAttribute("aria-label", "Navegação principal");
    const barOn = SLIDE_KEYS.includes(on) ? "songs" : String(on).startsWith("pasta:") ? "arquivos" : on;
    nav.innerHTML = BAR.map((it) => it ? `<a class="nv ${it[0] === barOn ? "on" : ""}" href="${it[1]}" data-k="${it[0]}" ${it[0] === barOn ? 'aria-current="page"' : ""}>${I[it[3]]}<span>${it[2]}</span>${it[0] === "console" ? '<i class="live-dot" title="Culto ao vivo agora"></i>' : ""}</a>`
      : `<button class="create" type="button" aria-label="Criar">${I.plus}</button>`).join("");
    document.body.append(side, nav);
    side.querySelector(".sb-create").onclick = createSheet;
    side.querySelector(".sb-me").onclick = meSheet;
    nav.querySelector(".create").onclick = createSheet;
    nav.querySelector('[data-k="menu"]').onclick = (e) => { e.preventDefault(); menuSheet(); };
    addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !e.target.isContentEditable && !document.body.classList.contains("sheet-open")) createSheet(); });
    addEventListener("hashchange", () => navOn(activeKey()));
  }
  function who_() {
    const p = XL.people[me()], c = FILES.counts(), act = FILES.mine().filter((f) => f.status === "ativo").length;
    return `<span class="avatar">${p.ini}</span><span class="sb-me-t"><b>${p.name}</b><small>${p.title}</small><small>${act} arquivos · ${c.lixeira || 0} na lixeira</small></span>`;
  }
  function meSheet() {
    if (CLOUD) {
      const p = XL.people[me()];
      sheet(`<div class="stack"><div class="row between"><h2>Sua conta</h2><button class="icon-btn" onclick="UI.closeSheet()" aria-label="Fechar">${I.x}</button></div>
        <div class="create-row" style="width:100%"><span class="avatar">${p.ini}</span><span class="grow"><b>${p.name}</b><span>${p.email || ""} · ${p.title}</span></span></div>
        <div class="create-list"><a class="create-row" href="/"><span class="grow"><b>XLIDE clássico</b><span>Editor de decks, músicas e boards</span></span></a>
        <a class="create-row" href="equipe.html"><span class="grow"><b>Equipe e acesso</b><span>Papéis e áreas</span></span></a>
        <button class="create-row" data-out style="text-align:left;width:100%"><span class="grow"><b>Sair</b><span>Encerrar a sessão neste aparelho</span></span></button></div></div>`);
      qsa("[data-out]").forEach((b) => (b.onclick = () => XCLOUD.signOut()));
      return;
    }
    sheet(`<div class="stack"><div class="row between"><h2>Ver como</h2><button class="icon-btn" onclick="UI.closeSheet()" aria-label="Fechar">${I.x}</button></div><p class="muted" style="font-size:var(--t-sm)">No mockup, troque de pessoa para ver os arquivos de cada uma.</p>
      <div class="create-list">${Object.entries(XL.people).map(([k, p]) => `<button class="create-row" data-me="${k}" style="text-align:left;width:100%"><span class="avatar">${p.ini}</span><span class="grow"><b>${p.name}${k === me() ? " · você" : ""}</b><span>${p.title} · ${FILES.mine(k).filter((f) => f.status === "ativo").length} arquivos</span></span></button>`).join("")}</div></div>`);
    qsa("[data-me]").forEach((b) => (b.onclick = () => { setMe(b.dataset.me); const u = new URL(location.href); u.searchParams.delete("as"); location.href = u; }));
  }
  /* Repinta contadores e o cartão depois de mover, arquivar ou excluir. */
  function refreshNav() {
    const on = activeKey();
    qsa(".sbar .sb-scroll, .sheet .sb-menu").forEach((el) => (el.innerHTML = groupsHTML(on)));
    qsa(".sbar .sb-me").forEach((el) => (el.innerHTML = who_()));
  }
  function menuSheet() {
    sheet(`<div class="stack"><div class="row between"><h2>Menu</h2><button class="icon-btn" onclick="UI.closeSheet()" aria-label="Fechar">${I.x}</button></div><button class="sb-me" type="button" onclick="UI.meSheet()">${who_()}</button><div class="sb-menu">${groupsHTML(activeKey())}</div></div>`);
    window.I18N && I18N.mount();
  }
  /* A Biblioteca troca de aba sem recarregar: acende o item certo. */
  function navOn(k) { qsa(".sbar .sb-i").forEach((a) => { a.classList.toggle("on", a.dataset.k === k); a.toggleAttribute("aria-current", a.dataset.k === k); }); }

  /* Folha "Criar": as quatro coisas que se fazem no XLIDE. */
  const CREATE = [
    ["board", "Moodboard", "Tela livre: imagens, notas, cores, tarefas", "board.html?v=mood&novo=1"],
    ["map", "Mapa mental", "A ideia no centro e as etapas em volta", "board.html?v=map&novo=1"],
    ["slides", "Deck de slides", "Apresentação, avisos ou sermão", "deck.html?novo=avisos"],
    ["doc", "Importar PDF", "Slides do pastor: cada página vira um slide", "#pdf"],
    ["music", "Música", "Letra que vira slides, com o tempo da música", "musica.html"],
    ["list", "Programa do culto", "A linha do tempo do sábado", "programa.html"],
  ];
  if (CLOUD) CREATE.forEach((c) => { if (c[0] === "board") c[3] = "/boards"; if (c[0] === "map") c[3] = "/boards"; if (c[0] === "music") c[3] = "/music"; });
  function createSheet() {
    sheet(`<div class="stack"><div class="row between"><h2>Criar</h2><button class="icon-btn" onclick="UI.closeSheet()" aria-label="Fechar">${I.x}</button></div>
      <div class="create-list">${CREATE.map(([ic, n, d, f]) => `<a class="create-row" href="${f === "#pdf" ? "#" : f}" ${f === "#pdf" ? "data-pdf" : ""}>${I[ic]}<span class="grow"><b>${n}</b><span>${d}</span></span>${I.arrow}</a>`).join("")}</div></div>`);
    qsa("[data-pdf]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); closeSheet(); window.PDFIMPORT && PDFIMPORT.pick((r) => { const f = PDFIMPORT.toFile(r, "pregacao"); setTimeout(() => (location.href = "deck.html?f=" + f.id), 700); }); }));
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
  /* ── atalhos auxiliares: painel ao lado do menu com cartões de cada grupo ── */
  const mini = (o) => (window.DRAWER && window.XLOOK ? DRAWER.mini({ seconds: 0, ...o }) : "");
  const yt = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  function flyData(g) {
    const c = FILES.counts(), mine = FILES.mine().filter((f) => f.status === "ativo");
    const P = XL.program, pend = P.items.filter((it) => it.type === "video" || (it.type === "song" && XL.songs[it.song].langs.length < 2)).length;
    if (g === "Arquivos") return { t: "Arquivos", ins: ["Seus arquivos", `${mine.length} ativos · ${mine.filter((f) => f.star).length} favoritos. O mais recente: ${mine[0] ? mine[0].name : "nenhum"}.`, "arquivos.html"],
      cards: [...FOLDERS.map(([k, n]) => { const f = mine.find((x) => x.folder === k); return [`arquivos.html?pasta=${k}`, n, `${c[k] || 0} arquivos`, f ? mini(f) : ""]; }), ...STATUS.map(([k, n, d]) => [`arquivos.html?pasta=${k}`, n, `${c[k] || 0} · ${d}`, ""])] };
    if (g === "Slides") return { t: "Slides", ins: ["Para sábado", `${P.items.filter((it) => it.type === "song").length} músicas e ${P.items.filter((it) => it.deck).length} decks no programa.`, "biblioteca.html"],
      cards: [["biblioteca.html?tab=songs", "Músicas", `${Object.keys(XL.songs).length} músicas`, window.XLOOK ? `<div class="slide song">${XLOOK.songSlide("s1", 0, { section: false })}</div>` : ""], ["biblioteca.html?tab=decks", "Decks", `${Object.keys(XL.decks).length} decks`, mini({ eyebrow: "Série", title: "Casa de muitos", bg: "wash:gold", font: "serif" })], ["kit.html#avisos", "Fundos de avisos", "6 fundos", mini({ eyebrow: "Sábado 13/12", title: "Batismo", bg: "plain:papel", layout: null })], ["biblioteca.html?tab=tpl", "Modelos", `${XL.templates.length} modelos`, ""]] };
    if (g === "Estúdio") return { t: "Estúdio", ins: ["Testar antes de criar", "23 fundos, 4 fontes e 5 cores de texto, com edição direto no slide.", "kit.html#testar"],
      cards: [["kit.html", "Fundos e fontes", "23 fundos · 4 fontes", mini({ eyebrow: "Ember", title: "Aa Bb", bg: "wash:ember" })], ["kit.html#testar", "Testar um slide", "Música, deck ou aviso", mini({ eyebrow: "Teste", title: "Tem lugar na mesa", bg: "wash:dusk" })], ["estudio.html", "Editor de música", "Tempo de cada slide", ""]] };
    if (g === "Culto") return { t: "Culto", ins: [`${P.title} · ${P.date.split(",")[1] || P.date}`, pend ? `${pend} pendências antes do culto. ${P.items.length} itens, começa ${P.starts}.` : "Tudo pronto.", "programa.html"],
      cards: [["agenda.html", "Agenda", "Semana do culto", ""], ["programa.html", "Programa", `${P.items.length} itens · rascunho`, mini({ eyebrow: "Programa", title: P.title, bg: "wash:midnight" })], ["console.html", "Ao vivo", "Multiview e trilha", mini({ eyebrow: "Na tela", title: "05:00", bg: "loop:5djr6ofyLLY" })], ["tela.html", "Tela do projetor", "Abrir na outra tela", ""], ["relatorio.html", "Relatório", "Último: +9 min", ""]] };
    if (g === "Ideias") return { t: "Ideias", ins: ["Boards", `${Object.keys(XL.boards).length} boards. Mais recente: ${XL.boards.b1.title}.`, "boards.html"],
      cards: Object.entries(XL.boards).map(([id, b]) => [`board.html?id=${id}`, b.title, `${b.items} itens · ${b.updated}`, `<div class="fly-mb"><i style="background-image:url(${yt(b.loops[0])})"></i><i style="background-image:url(${yt(b.loops[1])})"></i></div>`]) };
    return { t: "Igreja", ins: ["Equipe", `${Object.keys(XL.people).length} pessoas em ${Object.keys(XL.areas).length} áreas.`, "equipe.html"], cards: [["equipe.html", "Equipe e acesso", "Quem edita o quê", ""], ["equipe.html#perm-t", "Permissões", "Admin, púlpito, música, operador", ""]] };
  }
  let flyEl = null, flyOn = null;
  function closeFly() { flyEl && flyEl.remove(); flyEl = null; flyOn = null; qsa(".sb-h.flying, .sb-flybtn.flying").forEach((b) => b.classList.remove("flying")); }
  function openFly(g, btn) {
    if (flyOn === g) return closeFly();
    closeFly(); flyOn = g; btn.classList.add("flying");
    const d = flyData(g);
    flyEl = document.createElement("aside"); flyEl.className = "fly"; flyEl.setAttribute("aria-label", "Atalhos de " + d.t);
    flyEl.innerHTML = `<div class="fly-h"><b>${d.t}</b><button class="icon-btn" data-flyx aria-label="Fechar atalhos">${I.x}</button></div>
      <a class="fly-ins" href="${d.ins[2]}"><span class="lbl">${d.ins[0]}</span><span>${d.ins[1]}</span>${I.chev}</a>
      ${d.cards.map(([h, t, sub, pv]) => `<a class="fly-c" href="${h}">${pv ? `<span class="fly-pv">${pv}</span>` : ""}<span class="fly-t"><b>${t}</b><small>${sub}</small></span>${I.chev}</a>`).join("")}`;
    document.body.append(flyEl);
    flyEl.querySelector("[data-flyx]").onclick = closeFly;
    window.XLOOK && XLOOK.hydrate && XLOOK.hydrate(flyEl);
  }
  document.addEventListener("click", (e) => {
    const f = e.target.closest("[data-fly]");
    if (f) {
      e.preventDefault();
      if (!matchMedia("(min-width: 900px)").matches || f.closest(".sb-menu")) { const t = f.closest("[data-g]")?.querySelector("[data-tg]"); t && t.click(); return; }
      return openFly(f.dataset.fly, f);
    }
    if (flyEl && !flyEl.contains(e.target) && !e.target.closest(".sbar")) closeFly();
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && flyEl) closeFly(); });

  window.FILES = FILES;
  window.UI = { I, glyph, mark, NAV, CREATE, createSheet, menuSheet, navOn, me, setMe, refreshNav, meSheet, set, person, who, ty, min, qs, qsa, sheet, closeSheet, toggleTheme };
  /* ── Ao vivo em miniatura: com o culto rodando, a tela projetada fica visível em qualquer página.
     Arrasta pelo topo, fica sempre dentro da área da página, começa no canto inferior direito. ── */
  const loadJS = (src) => new Promise((res) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = res; document.head.append(s); });
  async function pip() {
    if (!document.body.dataset.tab || document.body.dataset.tab === "console") return;
    if (!window.XLOOK) await loadJS("assets/look.js");
    if (!window.LIVE) await loadJS("assets/engine.js");
    if (!window.paintTransition) await loadJS("assets/render.js");
    if (!window.LIVE) return;
    const PK = "xlide.v2.pip";
    const el = document.createElement("aside");
    el.className = "pip"; el.setAttribute("aria-label", "Tela ao vivo"); el.hidden = true;
    el.innerHTML = `<div class="pip-h" title="Arraste para mover"><i class="live-dot"></i><b>Ao vivo</b><span class="pip-t"></span><a class="pip-a" href="console.html" title="Abrir o console">Abrir</a><button class="pip-m" type="button" aria-label="Minimizar">–</button></div><div class="tx-host pip-s"></div>`;
    document.body.append(el);
    const host = el.querySelector(".pip-s");
    let pos = (() => { try { return JSON.parse(localStorage.getItem(PK)) || {}; } catch { return {}; } })();
    const bounds = () => {
      const side = matchMedia("(min-width: 900px)").matches && qs(".sbar") ? qs(".sbar").getBoundingClientRect().right : 0;
      const top = (qs(".mk")?.getBoundingClientRect().bottom || 0);
      const bottom = innerHeight - (matchMedia("(min-width: 900px)").matches ? 0 : (qs(".tabbar")?.offsetHeight || 0));
      return { l: side + 8, t: top + 8, r: innerWidth - 8, b: bottom - 8 };
    };
    const place = () => {
      const B = bounds(), w = el.offsetWidth, h = el.offsetHeight;
      const x = pos.x == null ? B.r - w : Math.min(Math.max(pos.x, B.l), B.r - w);
      const y = pos.y == null ? B.b - h : Math.min(Math.max(pos.y, B.t), B.b - h);
      el.style.left = x + "px"; el.style.top = y + "px";
    };
    el.classList.toggle("min", !!pos.min);
    el.querySelector(".pip-m").onclick = () => { pos.min = !pos.min; el.classList.toggle("min", pos.min); el.querySelector(".pip-m").textContent = pos.min ? "+" : "–"; el.querySelector(".pip-m").setAttribute("aria-label", pos.min ? "Mostrar a tela" : "Minimizar"); try { localStorage.setItem(PK, JSON.stringify(pos)); } catch {} place(); };
    el.querySelector(".pip-m").textContent = pos.min ? "+" : "–";
    const hd = el.querySelector(".pip-h");
    hd.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button")) return;
      e.preventDefault(); hd.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
      el.classList.add("drag");
      hd.onpointermove = (ev) => { pos.x = ev.clientX - ox; pos.y = ev.clientY - oy; place(); };
      hd.onpointerup = hd.onpointercancel = () => { hd.onpointermove = null; el.classList.remove("drag"); const r2 = el.getBoundingClientRect(); pos.x = r2.left; pos.y = r2.top; try { localStorage.setItem(PK, JSON.stringify(pos)); } catch {} };
    });
    addEventListener("resize", place);
    LIVE.loop((st, T) => {
      const on = st.status === "live" || st.status === "paused";
      if (el.hidden === on) { el.hidden = !on; if (on) requestAnimationFrame(place); }
      if (!on) return;
      el.classList.toggle("paused", st.status === "paused");
      set(el.querySelector(".pip-t"), `${T.it ? T.it.title : ""} · ${LIVE.mmss(T.remaining)}${st.status === "paused" ? " · pausado" : ""}`);
      if (!pos.min) paintTransition(host, T.it, st.slide, T, "pt", st.status, st.transition || "fade");
    });
  }

  document.addEventListener("DOMContentLoaded", () => { mkBar(); tabbar(); pip(); });
})();
