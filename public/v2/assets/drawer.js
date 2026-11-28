/* XLIDE v2 · gaveta de prévia + página de campos (Programa, Biblioteca, Boards).
   Gaveta: o item como vai aparecer na tela, com fundo, fonte, texto e um timer que dá para testar.
   Expandir: abre a página de campos, onde cada bloco do layout (rótulo, título, texto, timer)
   é arrastado no canvas e ajustado em tamanho, alinhamento, cor e visibilidade.
   No app real: SlideFrame + painel de estilo do editor (Sheet) e o editor de layout em tela cheia. */
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const mmss = (t) => `${String(Math.floor(Math.max(0, t) / 60)).padStart(2, "0")}:${String(Math.max(0, Math.round(t)) % 60).padStart(2, "0")}`;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const BGS = () => [["solid:#0e0e0d", "Preto"], ...XLOOK.bgLib().slice(0, 8).map((it) => [it.bg, it.name]), ...XLOOK.LOOPS.slice(0, 6).map((l) => ["loop:" + l.id, l.name]), ...XLOOK.WASHES.slice(0, 7).map((w) => ["wash:" + w.id, w.name]), ...XLOOK.PLAIN.map((p) => ["plain:" + p.id, p.name])];
  const font = (id) => XLOOK.fontOf(id);
  const fontSeg = (cur, attrs = "") => `${XLOOK.fontChoices(cur).map((f) => `<button data-f="${f.id.replace(/"/g, "&quot;")}" class="${f.id === cur ? "on" : ""}" style="font-family:${f.family.replace(/"/g, "'")};text-transform:none;letter-spacing:0;font-size:15px">${f.name}</button>`).join("")}<button data-f="__more" style="text-transform:none;letter-spacing:0;font-size:15px" title="Todas as fontes (Google Fonts, Fontshare, importadas)">+ Todas</button>`;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  /* ajuste do fundo (brilho, saturação, contraste, desfoque) em volta do fundo do slide */
  const fxWrap = (fx, html) => { const f = fx && XLOOK.fxStyle ? XLOOK.fxStyle(fx) : ""; return f ? `<div class="xw-fx" style="position:absolute;inset:0;${f}">${html}</div>` : html; };
  const fxRanges = (fx = {}) => [["bri", "Brilho", 0.2, 1.6, 0.05, 1, "%"], ["sat", "Saturação", 0, 2, 0.05, 1, "%"], ["con", "Contraste", 0.5, 1.5, 0.05, 1, "%"], ["blur", "Desfoque", 0, 12, 0.5, 0, " px"]]
    .map(([k, n, a, b, st, d, u]) => { const v = fx[k] ?? d; return `<label class="ctl dw-fx"><span>${n}</span><input type="range" data-fx="${k}" min="${a}" max="${b}" step="${st}" value="${v}"><output>${u === "%" ? Math.round(v * 100) + "%" : v + u}</output></label>`; }).join("");
  const IC_EXPAND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>`;

  /* ── layout por blocos ── x/y = centro em %, w = largura em %, s = tamanho em cqw */
  const BLOCKS = [["eb", "Rótulo"], ["t", "Título"], ["b", "Texto"], ["tm", "Timer"]];
  const PRESETS = {
    centro: { name: "Centro", eb: { x: 50, y: 36, w: 70, s: 1.5, a: "center", on: true }, t: { x: 50, y: 48, w: 80, s: 6.4, a: "center", on: true }, b: { x: 50, y: 62, w: 66, s: 2.6, a: "center", on: true }, tm: { x: 91, y: 91, w: 14, s: 3, a: "center", on: true, box: true } },
    contagem: { name: "Contagem grande", eb: { x: 50, y: 22, w: 70, s: 1.5, a: "center", on: true }, t: { x: 50, y: 31, w: 80, s: 3.2, a: "center", on: true }, b: { x: 50, y: 80, w: 66, s: 2.2, a: "center", on: true }, tm: { x: 50, y: 56, w: 80, s: 20, a: "center", on: true, box: false } },
    esquerda: { name: "Esquerda", eb: { x: 30, y: 30, w: 50, s: 1.5, a: "left", on: true }, t: { x: 40, y: 46, w: 70, s: 6.4, a: "left", on: true }, b: { x: 35, y: 64, w: 60, s: 2.6, a: "left", on: true }, tm: { x: 91, y: 91, w: 14, s: 3, a: "center", on: true, box: true } },
    rodape: { name: "Faixa embaixo", eb: { x: 50, y: 70, w: 80, s: 1.4, a: "center", on: false }, t: { x: 50, y: 80, w: 86, s: 4.4, a: "center", on: true }, b: { x: 50, y: 89, w: 80, s: 2.2, a: "center", on: true }, tm: { x: 92, y: 8, w: 14, s: 2.6, a: "center", on: true, box: true } },
  };
  /* Cafofo (Class × Classe Jovens): pôster em Archivo condensada caixa-alta, citação em Lexend com [ ],
     rótulo com contorno tracejado no canto, rodapé (página, seção) e a marca + o círculo das quatro cores.
     Destaque com ==palavra== (faixa embaixo da palavra ou palavra na cor de destaque). */
  const CF_EB = { x: 2.6, y: 7, w: 60, s: 1.35, a: "left", on: true, f: "Lexend", up: true, wt: 700, ls: ".08em", dash: true };
  Object.assign(PRESETS, {
    "cf-cover": { name: "Cafofo · capa", eb: CF_EB, img: { x: 10.5, y: 27, w: 11, s: 1, a: "left", on: true, src: "/brand/cafofo/mark-sun.svg" }, t: { x: 41, y: 52, w: 78, s: 10.5, a: "left", on: true, f: "Archivo", st: 70, wt: 800, up: true, lh: 0.88, hm: "ink", hc: "#F4D266", ns: true }, b: { x: 36, y: 78, w: 66, s: 2.2, a: "left", on: true, f: "Lexend" }, tm: { x: 88, y: 84, w: 18, s: 4.6, a: "right", on: true, f: "Archivo", st: 70, wt: 800 } },
    "cf-count": { name: "Cafofo · boas-vindas com contagem", eb: CF_EB, img: { x: 10.5, y: 25, w: 10, s: 1, a: "left", on: true, src: "/brand/cafofo/mark-sun.svg" }, t: { x: 40, y: 53, w: 76, s: 10.5, a: "left", on: true, f: "Archivo", st: 70, wt: 800, up: true, lh: 0.88, hm: "ink", hc: "#F4D266", ns: true }, b: { x: 30, y: 80, w: 54, s: 2.4, a: "left", on: true, f: "Lexend", wt: 500 }, tm: { x: 84, y: 79, w: 26, s: 9, a: "right", on: true, f: "Archivo", st: 70, wt: 800 } },
    "cf-poster": { name: "Cafofo · pôster", eb: { ...CF_EB, x: 2.6, dash: false, l: true }, t: { x: 50, y: 49, w: 88, s: 10, a: "center", on: true, f: "Archivo", st: 70, wt: 800, up: true, lh: 0.88, hm: "bar", hc: "#FAF8F1", ns: true }, b: { x: 50, y: 78, w: 70, s: 2.4, a: "center", on: true, f: "Lexend", wt: 500 }, tm: { x: 91, y: 8, w: 14, s: 3, a: "center", on: true, f: "Archivo", st: 70, wt: 800 } },
    "cf-quote": { name: "Cafofo · frase [ ]", eb: CF_EB, t: { x: 61, y: 46, w: 58, s: 4.4, a: "left", on: true, f: "Lexend", wt: 600, lh: 1.12, hm: "bar", hc: "#F4D266", ns: true }, b: { x: 61, y: 66, w: 58, s: 2.2, a: "left", on: true, f: "Lexend" }, tm: { x: 91, y: 8, w: 14, s: 3, a: "center", on: true, box: true } },
    "cf-info": { name: "Cafofo · informação", eb: CF_EB, t: { x: 40, y: 38, w: 74, s: 7.2, a: "left", on: true, f: "Archivo", st: 70, wt: 800, up: true, lh: 0.9, hm: "bar", hc: "#F4D266", ns: true }, b: { x: 35, y: 66, w: 64, s: 2.5, a: "left", on: true, f: "Lexend", wt: 500, lh: 1.35 }, tm: { x: 91, y: 8, w: 14, s: 3, a: "center", on: true, box: true } },
  });
  const presetFor = (kind) => (/espera/i.test(kind || "") ? "contagem" : "centro");
  const layoutOf = (o) => (typeof o.layout === "string" ? clone(PRESETS[o.layout] || PRESETS.centro) : o.layout || clone(PRESETS[presetFor(o.kind || o.eyebrow)]));
  /* ==palavra== → destaque: "bar" = faixa por baixo da palavra; "ink" = a palavra na cor de destaque */
  const hl = (html, b) => html.replace(/==(.+?)==/g, (_, w) => b && b.hm === "ink" ? `<mark style="background:none;color:${b.hc || "#F4D266"}">${w}</mark>` : `<mark style="background:linear-gradient(transparent 56%, ${(b && b.hc) || "#F4D266"} 56% 94%, transparent 94%);color:inherit;padding:0 .04em">${w}</mark>`);
  /* moldura da marca: rodapé à esquerda (página, seção, assinatura) e a marca + o círculo das quatro cores à direita */
  function frameHTML(fr, ink) {
    if (!fr) return "";
    const foot = [fr.page ? `${fr.pageLabel || "Page"} ${fr.page}` : "", ...String(fr.foot || "").split("\n")].filter(Boolean);
    const mk = [fr.mark !== false ? `<img src="${esc(fr.markSrc || "/brand/cafofo/mark-sun.svg")}" alt="" style="width:4.2cqw;height:4.2cqw">` : "", fr.dots !== false ? `<img src="${esc(fr.dotsSrc || "/brand/cafofo/dots.svg")}" alt="" style="width:2.6cqw;height:2.6cqw">` : ""].join("");
    return `<div class="tpl-frame" style="position:absolute;left:2.8%;bottom:4.6%;font:600 1.05cqw/1.32 Lexend,var(--font);color:${esc(fr.ink || ink)};text-align:left">${foot.map(esc).join("<br>")}</div>
      <div class="tpl-frame" style="position:absolute;right:2.6%;bottom:4%;display:flex;align-items:center;gap:1cqw">${mk}</div>`;
  }

  /* O template: fundo + blocos posicionados. Usado no canvas, na gaveta e nas miniaturas. */
  function template(o, { timer = true, edit = false } = {}) {
    const F = font(o.font);
    const ink = o.ink || XLOOK.inkOf(o.bg) || "#f7f6f3";
    const L = layoutOf(o);
    const t = o.left ?? o.seconds;
    const blk = (k, html, extra = "") => {
      const b = L[k];
      if (!b || !b.on || !html) return "";
      const Fb = b.f ? font(b.f) : null;
      const st = `left:${b.x}%;top:${b.y}%;width:${b.w}%;text-align:${b.a};font-size:${b.s}cqw;${b.c ? `color:${b.c};` : ""}${Fb ? `font-family:${Fb.family.replace(/"/g, "'")};` : ""}${k !== "t" && b.bo ? "font-weight:700;" : ""}${k !== "t" && b.wt ? `font-weight:${b.wt};` : ""}${b.st ? `font-stretch:${b.st}%;` : ""}${b.up ? "text-transform:uppercase;" : ""}${b.lh ? `line-height:${b.lh};` : ""}${b.ls ? `letter-spacing:${b.ls};` : ""}${b.ns ? "text-shadow:none;" : ""}${b.dash ? "border:2px dashed currentColor;border-color:color-mix(in srgb,currentColor 55%,transparent);padding:.35em .6em;" : ""}${b.dash || b.l ? "width:auto;max-width:" + b.w + "%;white-space:nowrap;transform:translate(0,-50%);" : ""}`;
      const hs = edit ? '<span class="h hl"></span><span class="h hr"></span><span class="h c tl"></span><span class="h c tr"></span><span class="h c bl"></span><span class="h c br"></span>' : "";
      return `<div class="tpl-blk tpl-${k}${extra}${edit ? " ed" : ""}" data-b="${k}" style="${st}">${html}${hs}</div>`;
    };
    const T = L.t || {}, FT = T.f ? font(T.f) : F;
    const tw = T.wt || (T.bo === false ? FT.weight : Math.max(FT.weight, 600));
    const md = o.media && window.MEDIA ? MEDIA.parse(o.media) : null;
    if (md && o.mediaOnly) return MEDIA.html(md); // item de vídeo/áudio do programa: só a mídia, sem fonte nem estilo
    return `${md ? MEDIA.html(md) : ""}${md && md.kind === "video" ? "" : fxWrap(o.fx, XLOOK.backdrop(o.bg || "solid:#0e0e0d", o.image, { loop: o.vloop !== false, play: o.vplay !== false }))}<div class="xw-grain"></div>
      <div class="tpl2" style="color:${ink};font-family:${F.family.replace(/"/g, "'")}">
        ${blk("eb", o.eyebrow || edit ? `<span class="tx" data-ph="Rótulo">${esc(o.eyebrow)}</span>` : "")}
        ${blk("t", o.title || edit ? `<span class="tx" data-ph="Título" style="font-weight:${tw};letter-spacing:${T.st ? "-0.005em" : FT.track};${FT.upper ? "text-transform:uppercase;" : ""}">${edit ? esc(o.title) : hl(esc(o.title), T)}</span>` : "")}
        ${blk("b", o.text || edit ? `<span class="tx" data-ph="Texto">${edit ? esc(o.text) : hl(esc(o.text), L.b)}</span>` : "")}
        ${timer && o.seconds ? blk("tm", mmss(t), ` tpl-timer${L.tm.box ? " box" : ""}`) : ""}
        ${L.img && L.img.src ? blk("img", `<img class="tpl-im" src="${esc(L.img.src)}" alt="" draggable="false">`) : ""}
        ${edit ? '<i class="guide gv"></i><i class="guide gh"></i>' : frameHTML(o.frame || L.frame, ink)}
      </div>`;
  }
  const mini = (o, cls = "") => `<div class="slide song ${cls}">${template(o)}</div>`;

  /* ── gaveta ── o = { kind, eyebrow, title, text, bg, font, seconds, layout?, slides?, meta?, extra?, onSave } */
  function open(o) {
    const st = { ...o, bg: o.bg || "loop:5djr6ofyLLY", font: o.font || "grotesk", left: o.seconds, run: false, slide: 0, layout: clone(layoutOf(o)), per: clone(o.per || {}) };
    const lay = () => st.per[st.slide] || st.layout;
    let timer = null;
    const sh = UI.sheet(`<div class="stack dw">
      <div class="row between"><span class="lbl">${esc(o.kind)}${o.meta ? " · " + esc(o.meta) : ""}</span><span class="row" style="gap:var(--s2)"><button class="icon-btn" data-expand aria-label="Expandir: editar o layout em tela cheia" title="Expandir">${IC_EXPAND}</button><button class="icon-btn" data-close aria-label="Fechar">${UI.I.x}</button></span></div>
      <div class="slide song animate dw-stage" id="dw-stage" aria-label="Slide: clique num texto para selecionar, clique de novo para escrever"></div>
      <button class="btn ${o.editor ? "primary" : "ghost"} block" data-expand>${IC_EXPAND.replace("<svg", '<svg width="18" height="18"')} ${o.editor ? "Abrir no editor (tela cheia)" : "Expandir e editar o layout"}</button>
      ${o.slides ? `<div class="dw-strip" id="dw-strip"></div>` : ""}
      ${o.seconds ? `<div class="dw-timer"><button class="icon-btn" id="dw-play" aria-label="Testar o timer">${UI.I.play}</button><b class="num" id="dw-left"></b><span class="grow muted" style="font-size:var(--t-sm)">Timer na tela</span><div class="stepper" style="width:150px"><button data-d="-30" aria-label="Menos 30 segundos">−</button><b class="num" id="dw-dur" style="font-size:var(--t-md)"></b><button data-d="30" aria-label="Mais 30 segundos">+</button></div></div>` : ""}
      <div class="field"><span class="lbl">Fundo</span><div class="dw-bgs" id="dw-bgs"></div>
        <div class="row" style="gap:6px"><input class="input" id="dw-imp" placeholder="Importar: link do Pinterest, YouTube ou .mp4/.jpg" style="flex:1"><button class="btn" data-imp>Importar</button></div><span class="muted" id="dw-imp-msg" style="font-size:var(--t-xs)"></span>
        <details class="dw-fxbox"${o.fx ? " open" : ""}><summary class="lbl" style="cursor:pointer">Ajustar o fundo · brilho, saturação, contraste, desfoque</summary><div id="dw-fx" style="display:grid;gap:4px;margin-top:6px">${fxRanges(o.fx)}</div><button class="link" data-fxreset style="justify-self:start">Original</button></details></div>
      <div class="field"><span class="lbl">Fonte</span><div class="seg" id="dw-font">${fontSeg(o.font || "grotesk")}</div></div>
      <label class="field"><span class="lbl">Título na tela</span><input class="input" id="dw-title"></label>
      <label class="field"><span class="lbl">Texto</span><textarea class="textarea" id="dw-text" style="min-height:96px" placeholder="Escreva e veja como fica no template"></textarea></label>
      ${o.extra || ""}
      ${o.onSave ? `<div class="grid grid-2"><button class="btn primary block" data-save>Salvar</button><button class="btn ghost block" data-close>Cancelar</button></div>` : `<button class="btn ghost block" data-close>Fechar</button>`}
    </div>`);
    const $ = (s) => sh.querySelector(s);
    const cur = () => {
      const c = o.slides ? { ...st, ...(o.slides[st.slide] || {}), bg: st.bg, font: st.font, layout: lay() } : { ...st, layout: lay() };
      if (o.slides && st.slide === 0) Object.assign(c, { title: st.title, text: st.text });
      return c;
    };
    /* Os campos mostram o slide aberto; escrever no campo ou no slide é a mesma coisa. */
    const setText = (f, v) => { if (o.slides && !(st.slide === 0 && f !== "eyebrow")) o.slides[st.slide][f] = v; else st[f] = v; };
    function fields() { const c = cur(); if (document.activeElement !== $("#dw-title")) $("#dw-title").value = String(c.title || "").replace(/\n/g, " / "); if (document.activeElement !== $("#dw-text")) $("#dw-text").value = c.text || ""; }
    function paint() {
      cv.render();
      if (o.seconds) { $("#dw-left").textContent = mmss(st.left); $("#dw-dur").textContent = mmss(st.seconds); $("#dw-play").innerHTML = st.run ? UI.I.pause : UI.I.play; }
      $("#dw-bgs").innerHTML = [...(BGS().some(([bg]) => bg === st.bg) ? [] : [[st.bg, "Atual"]]), ...BGS()].map(([bg, n]) => `<button class="dw-bg${bg === st.bg ? " on" : ""}" data-bg="${bg}" title="${n}" aria-label="Fundo ${n}" aria-pressed="${bg === st.bg}"><span class="slide song">${XLOOK.backdrop(bg)}</span></button>`).join("");
      sh.querySelectorAll("#dw-font button").forEach((b) => b.classList.toggle("on", b.dataset.f === st.font));
      paintStrip();
    }
    function paintStrip() {
      if (o.slides) $("#dw-strip").innerHTML = o.slides.map((s, k) => `<button class="dw-th${k === st.slide ? " on" : ""}" data-s="${k}" aria-label="Slide ${k + 1}">${mini({ ...s, ...(k === 0 ? { title: st.title, text: st.text } : {}), bg: st.bg, font: st.font, layout: st.per[k] || st.layout, seconds: 0 })}<span class="lbl">${k + 1}</span></button>`).join("");
    }
    const tickTimer = () => {
      st.left -= 1;
      if (st.left <= 0) { st.left = 0; st.run = false; clearInterval(timer); }
      if (!document.body.contains(sh) || !document.body.classList.contains("sheet-open")) return clearInterval(timer);
      $("#dw-left").textContent = mmss(st.left);
      const tm = $("#dw-stage .tpl-timer"); if (tm) tm.firstChild.nodeValue = mmss(st.left);
      if (!st.run) paint();
    };
    sh.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.expand != null && o.editor) { clearInterval(timer); location.href = o.editor(st); return; }
      if (b.dataset.expand != null) { clearInterval(timer); st.run = false; expand(st, o, () => { fields(); paint(); }, { view: cur, text: setText }); }
      else if (b.dataset.bg) { st.bg = b.dataset.bg; paint(); }
      else if (b.dataset.imp != null) {
        const u = $("#dw-imp").value.trim(), m = $("#dw-imp-msg"); if (!/^https?:\/\//.test(u)) { m.textContent = "Cole um link."; return; }
        m.textContent = "Importando…";
        XLOOK.importBg([u]).then((j) => { if (j.imported[0]) { st.bg = j.imported[0].bg; $("#dw-imp").value = ""; m.textContent = `Importado: ${j.imported[0].name}. Fica na biblioteca da equipe.`; paint(); } else m.textContent = (j.errors[0] || {}).error || "Não importou."; }).catch((e) => (m.textContent = e.message));
      }
      else if (b.dataset.fxreset != null) { st.fx = null; $("#dw-fx").innerHTML = fxRanges({}); paint(); }
      else if (b.dataset.f === "__more") XLOOK.pickFont(st.font, (f) => { st.font = f; const seg = sh.querySelector("#dw-font"); if (seg) seg.innerHTML = fontSeg(f); paint(); });
      else if (b.dataset.f) { st.font = b.dataset.f; paint(); }
      else if (b.dataset.s) { st.slide = +b.dataset.s; fields(); paint(); }
      else if (b.dataset.d) { st.seconds = Math.max(30, st.seconds + +b.dataset.d); st.left = st.seconds; paint(); }
      else if (b.id === "dw-play") { st.run = !st.run; clearInterval(timer); if (st.run) { if (st.left <= 0) st.left = st.seconds; timer = setInterval(tickTimer, 1000); } paint(); }
      else if (b.dataset.save != null) { clearInterval(timer); o.onSave({ eyebrow: st.eyebrow, title: st.title, text: st.text, bg: st.bg, font: st.font, planned: st.seconds, layout: st.layout, per: st.per, ink: st.ink, fx: st.fx || null }); UI.closeSheet(); }
      else if (b.dataset.close != null) { clearInterval(timer); UI.closeSheet(); }
    });
    $("#dw-fx").addEventListener("input", (e) => {
      const r = e.target.closest("[data-fx]"); if (!r) return;
      const k = r.dataset.fx, v = +r.value; st.fx = { ...(st.fx || {}), [k]: v };
      r.nextElementSibling.textContent = k === "blur" ? v + " px" : Math.round(v * 100) + "%";
      paint();
    });
    $("#dw-title").oninput = (e) => { setText("title", e.target.value.replace(/ \/ /g, "\n")); paint(); };
    $("#dw-text").oninput = (e) => { setText("text", e.target.value); paint(); };
    /* editar direto no slide: clicar, escrever, mover, mudar tamanho, fonte e cor */
    const cv = CANVAS.attach($("#dw-stage"), {
      view: cur,
      layout: lay,
      text: setText,
      changed(kind) { if (kind === "text") { fields(); paintStrip(); } else if (kind !== "select") paintStrip(); },
      scope: o.slides ? () => ({ i: st.slide, n: o.slides.length, own: !!st.per[st.slide],
        all() { st.layout = clone(lay()); st.per = {}; },
        only() { st.per[st.slide] = clone(st.layout); },
        next() { st.per[st.slide + 1] = clone(lay()); st.slide++; paintStrip(); fields(); },
        go(d) { st.slide = clamp(st.slide + d, 0, o.slides.length - 1); paintStrip(); fields(); } }) : null,
    });
    fields(); paint();
    return sh;
  }

  /* ── página de campos (tela cheia) ── edita st no lugar e chama done() ao voltar */
  function expand(st, o, done, hooks = {}) {
    const before = clone({ layout: st.layout, per: st.per || {}, bg: st.bg, font: st.font, title: st.title, text: st.text, eyebrow: st.eyebrow, seconds: st.seconds, ink: st.ink || null });
    let sel = "t";
    st.per = st.per || {};
    const lay = () => st.per[st.slide || 0] || st.layout;
    const setLay = (v) => { if (st.per[st.slide || 0]) st.per[st.slide || 0] = v; else st.layout = v; };
    const view = () => (hooks.view ? hooks.view() : { ...st, layout: lay() });
    const getText = (f) => view()[f] ?? "";
    const putText = (f, v) => (hooks.text ? hooks.text(f, v) : (st[f] = v));
    const page = document.createElement("div");
    page.className = "lx";
    page.setAttribute("role", "dialog");
    page.setAttribute("aria-label", "Editar layout");
    page.innerHTML = `
      <header class="lx-head">
        <button class="icon-btn" data-back aria-label="Voltar para a gaveta">${UI.I.back}</button>
        <div class="grow" style="min-width:0"><span class="lbl">${esc(o.kind)} · layout</span><h2 class="lx-title"></h2></div>
        <div class="seg lx-presets" id="lx-pre">${Object.entries(PRESETS).map(([k, p]) => `<button data-pre="${k}">${p.name}</button>`).join("")}</div>
        <button class="btn ghost" data-cancel>Descartar</button>
        <button class="btn primary" data-back>Aplicar</button>
      </header>
      <div class="lx-body">
        <section class="lx-canvas">
          <div class="slide song animate lx-stage" id="lx-stage" aria-label="Canvas: arraste os blocos"></div>
          <p class="lx-hint">Clique num bloco para selecionar e clique de novo para escrever ali mesmo. Arraste para mover; as alças das laterais mudam a largura e as dos cantos mudam o tamanho. Setas movem 1% (Shift, 5%), Delete oculta.</p>
          <div class="lx-mini" id="lx-mini"></div>
        </section>
        <aside class="lx-fields" id="lx-fields"></aside>
      </div>`;
    document.body.append(page);
    document.body.classList.add("lx-open");
    const $ = (s) => page.querySelector(s);
    const stage = $("#lx-stage");

    function paintStage() { cv.render(); paintMini(); }
    function paintMini() { $(".lx-title").textContent = String(getText("title")).split("\n")[0]; $("#lx-mini").innerHTML = ["Na tela", "Miniatura no programa"].map((n, k) => `<figure><div class="slide song" style="width:${k ? 120 : 200}px">${template(view())}</div><figcaption class="lbl">${n}</figcaption></figure>`).join(""); }
    function blockFields(k, name) {
      const b = lay()[k];
      const textField = k === "eb" ? `<input class="input" data-txt="eyebrow" value="${esc(getText("eyebrow"))}">` : k === "t" ? `<textarea class="textarea" data-txt="title" style="min-height:64px">${esc(getText("title"))}</textarea>` : k === "img" ? "" : k === "b" ? `<textarea class="textarea" data-txt="text" style="min-height:72px">${esc(getText("text"))}</textarea>` : `<div class="stepper"><button data-d="-30" aria-label="Menos 30 segundos">−</button><b class="num" style="font-size:var(--t-md)">${mmss(st.seconds || 0)}</b><button data-d="30" aria-label="Mais 30 segundos">+</button></div>`;
      const max = k === "tm" ? 26 : k === "t" ? 14 : 6;
      return `<details class="lx-b${k === sel ? " sel" : ""}" data-sec="${k}" ${k === sel ? "open" : ""}>
        <summary><span class="lx-dot"></span><b>${name}</b><span class="grow"></span><button class="toggle${b.on ? " on" : ""}" data-on="${k}" role="switch" aria-checked="${b.on}" aria-label="Mostrar ${name}"></button></summary>
        <div class="lx-bf">
          ${textField}
          <label class="ctl"><span>Tamanho</span><input type="range" data-r="${k}:s" min="0.8" max="${max}" step="0.1" value="${b.s}"><output>${b.s.toFixed(1)}</output></label>
          <label class="ctl"><span>Largura</span><input type="range" data-r="${k}:w" min="8" max="100" step="1" value="${b.w}"><output>${Math.round(b.w)}%</output></label>
          <div class="lx-xy"><label class="field"><span class="lbl">X %</span><input class="input" type="number" min="0" max="100" data-n="${k}:x" value="${b.x}"></label><label class="field"><span class="lbl">Y %</span><input class="input" type="number" min="0" max="100" data-n="${k}:y" value="${b.y}"></label></div>
          <div class="seg">${[["left", "Esquerda"], ["center", "Centro"], ["right", "Direita"]].map(([v, n]) => `<button data-al="${k}:${v}" class="${b.a === v ? "on" : ""}">${n}</button>`).join("")}</div>
          <div class="inks"><button class="sw auto${b.c ? "" : " on"}" data-ink="${k}:">Auto</button>${XLOOK.INKS.map((c) => `<button class="sw${b.c === c ? " on" : ""}" data-ink="${k}:${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join("")}</div>
          ${k === "tm" ? `<label class="row between" style="font-size:var(--t-sm)"><span>Caixa escura atrás do número</span><button class="toggle${b.box ? " on" : ""}" data-box role="switch" aria-checked="${!!b.box}"></button></label>` : ""}
        </div></details>`;
    }
    function paintFields() {
      const f = $("#lx-fields");
      const keep = f.scrollTop;
      f.innerHTML = `
        <div class="lx-sec"><span class="lbl">Blocos</span>${[...BLOCKS, ...(lay().img ? [["img", "Imagem"]] : [])].filter(([k]) => (k !== "tm" || st.seconds) && lay()[k]).map(([k, n]) => blockFields(k, n)).join("")}</div>
        <div class="lx-sec"><span class="lbl">Fundo</span><div class="dw-bgs">${BGS().map(([bg, n]) => `<button class="dw-bg${bg === st.bg ? " on" : ""}" data-bg="${bg}" title="${n}" aria-label="Fundo ${n}"><span class="slide song">${XLOOK.backdrop(bg)}</span></button>`).join("")}</div></div>
        <div class="lx-sec"><span class="lbl">Fonte</span><div class="seg">${fontSeg(st.font)}</div></div>`;
      f.scrollTop = keep;
      page.querySelectorAll("#lx-pre button").forEach((b) => b.classList.toggle("on", JSON.stringify(PRESETS[b.dataset.pre]) === JSON.stringify({ name: PRESETS[b.dataset.pre].name, ...lay() })));
    }
    const repaint = () => { paintStage(); paintFields(); };
    function select(k) { sel = k; if (cv.sel !== k) cv.select(k); page.querySelectorAll(".lx-b").forEach((d) => { const on = d.dataset.sec === k; d.classList.toggle("sel", on); d.open = on; }); page.querySelector(`.lx-b[data-sec="${k}"]`)?.scrollIntoView({ block: "nearest" }); }

    // o canvas: o mesmo editor da gaveta e do Estúdio (canvas.js)
    const cv = CANVAS.attach(stage, {
      view, layout: lay,
      text: putText,
      changed(kind, k) {
        if (kind === "select") { if (k) { sel = k; page.querySelectorAll(".lx-b").forEach((d) => { const on = d.dataset.sec === k; d.classList.toggle("sel", on); d.open = on; }); page.querySelector(`.lx-b[data-sec="${k}"]`)?.scrollIntoView({ block: "nearest" }); } return; }
        if (kind === "text") { const f = page.querySelector(`[data-txt="${{ eb: "eyebrow", t: "title", b: "text" }[k]}"]`); if (f && document.activeElement !== f) f.value = getText(f.dataset.txt); paintMini(); return; }
        paintMini(); paintFields();
      },
    });

    page.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (e.target.closest("summary") && !b) { const sec = e.target.closest(".lx-b"); e.preventDefault(); select(sec.dataset.sec); return; }
      if (!b) return;
      const ds = b.dataset;
      if (ds.back != null) return close();
      if (ds.cancel != null) { Object.assign(st, clone(before)); return close(); }
      if (b.closest(".cv")) return; // barra do canvas cuida de si
      if (ds.pre) { const v = clone(PRESETS[ds.pre]); delete v.name; if (lay().img) v.img = lay().img; setLay(v); return repaint(); }
      if (ds.on) { e.preventDefault(); const bl = lay()[ds.on]; bl.on = !bl.on; return repaint(); }
      if (ds.al) { const [k, v] = ds.al.split(":"); lay()[k].a = v; return repaint(); }
      if (ds.ink != null) { const [k, c] = ds.ink.split(":"); if (c) lay()[k].c = c; else delete lay()[k].c; return repaint(); }
      if (ds.box != null) { lay().tm.box = !lay().tm.box; return repaint(); }
      if (ds.d) { st.seconds = Math.max(30, (st.seconds || 0) + +ds.d); st.left = st.seconds; return repaint(); }
      if (ds.bg) { st.bg = ds.bg; return repaint(); }
      if (ds.f === "__more") return XLOOK.pickFont(st.font, (f) => { st.font = f; repaint(); });
      if (ds.f) { st.font = ds.f; return repaint(); }
    });
    page.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.txt) { putText(t.dataset.txt, t.value); paintStage(); }
      if (t.dataset.r) { const [k, p] = t.dataset.r.split(":"); lay()[k][p] = +t.value; t.nextElementSibling.textContent = p === "w" ? Math.round(t.value) + "%" : (+t.value).toFixed(1); paintStage(); }
      if (t.dataset.n) { const [k, p] = t.dataset.n.split(":"); lay()[k][p] = clamp(+t.value || 0, 0, 100); paintStage(); }
    });
    function onKey(e) { if (e.key === "Escape" && !cv.sel && !cv.editing) close(); }
    addEventListener("keydown", onKey);
    function close() { removeEventListener("keydown", onKey); page.remove(); document.body.classList.remove("lx-open"); done && done(); }
    repaint();
    $("[data-back]").focus();
  }

  /* Slides de exemplo de um deck (capa + conteúdo), para a prévia analisável. */
  function deckSlides(d) {
    const pages = [
      { kind: "Deck", eyebrow: d.layout, title: d.title },
      { eyebrow: "02", title: "Por que estamos aqui", text: "Uma frase curta que resume o ponto." },
      { eyebrow: "03", title: "Três pontos", text: "Primeiro ponto\nSegundo ponto\nTerceiro ponto" },
      { eyebrow: "04", title: "Próximo passo", text: "O que fazer nesta semana." },
    ];
    return pages.slice(0, Math.min(4, d.slides));
  }

  window.DRAWER = { open, expand, template, mini, deckSlides, mmss, PRESETS };
})();
