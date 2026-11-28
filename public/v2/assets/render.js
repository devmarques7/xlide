/* XLIDE v2 · o que a tela mostra para cada tipo de item (console, tela e página pública usam o mesmo).
   No app real: SlideView do XLIDE para decks/letras + layouts novos "wait", "pause", "sermon". */
window.renderSlide = function (it, slide, T, lang = "pt", status = "live") {
  // um bloco só (eyebrow + título) para ficar no centro da tela; dois filhos soltos dividiam a altura e subiam
  if (status === "idle") return { cls: "blank", html: `<div><div class="s-eyebrow">XLIDE</div><div class="s-title" style="opacity:.25">●</div></div>` };
  if (status === "done") return { cls: "blank", html: `<div><div class="s-eyebrow">Obrigado por estar aqui</div><div class="s-title">Até sábado.</div></div>` };
  // páginas de PDF (ou slides com imagem): a página inteira, sem cortar, sobre fundo preto
  const pg = it.type !== "song" && window.LIVE ? LIVE.slidesOf(it)[slide] : null;
  if (pg && pg.image) return { cls: "page", html: `<img class="s-page" src="${String(pg.image).replace(/"/g, "&quot;")}" alt="${String(it.title).replace(/"/g, "&quot;")} · ${slide + 1}">` };
  switch (it.type) {
    case "song": {
      const S = XL.songs[it.song], o = (S.langs && S.langs[0]) || lang, t2 = (S.langs || []).find((l) => l !== o && S.lyrics[l]);
      const s = XL.songSlides(it.song, o)[slide] || { text: "" };
      const tr = t2 ? XL.songSlides(it.song, t2)[slide] : null;
      return { html: `${s.section ? `<div class="s-section">${s.section}</div>` : ""}<div><div class="s-lines">${s.text}</div>${tr ? `<div class="s-trans">${tr.text}</div>` : ""}</div><div class="s-corner">${XL.songs[it.song].title}</div>` };
    }
    case "wait":
      return { html: `<div><div class="s-eyebrow">${it.text || "Começamos em instantes"}</div><div class="s-count">${LIVE.mmss(Math.max(0, T.remaining))}</div></div>` };
    case "notice":
      return { html: `<div><div class="s-eyebrow">Avisos</div><div class="s-title">${it.title}</div>${it.text ? `<div class="s-body">${it.text.replace(/ · /g, "<br>")}</div>` : ""}</div>` };
    case "sermon":
      return { html: `<div><div class="s-eyebrow">${it.text || ""}</div><div class="s-title">${it.title}</div><div class="s-body">${XL.people[it.owner].name}${slide ? ` · slide ${slide + 1}` : ""}</div></div>` };
    case "video":
      return { html: `<div><div class="s-eyebrow">Vídeo</div><div class="s-title">▶</div><div class="s-body">${it.title}</div></div>` };
    case "media":
      return { cls: "media", html: window.MEDIA ? MEDIA.html(it.media, { mute: it.mute }) || `<div class="s-eyebrow">Link não reconhecido</div>` : "" };
    case "pause":
      return { cls: "blank", html: `<div class="s-eyebrow" style="opacity:.3">XLIDE</div>` };
    default:
      return { html: `<div><div class="s-eyebrow">${XL.types[it.type].name}</div><div class="s-title">${it.title}</div></div>` };
  }
};
/* Visual de um item do programa (o mesmo da gaveta do Programa): fundo, fonte, layout, cor, ajuste do fundo.
   Programa, console e projetor usam este; música e vídeo/áudio têm os próprios. */
window.ITEMLOOK = (function () {
  const DEFAULT_BG = { song: null, wait: "wash:midnight", notice: "wash:amber", prayer: "loop:CQ0keZI1gds", sermon: "wash:gold", video: "solid:#0e0e0d", pause: "solid:#0e0e0d" };
  const look = (it) => ({ bg: it.bg || DEFAULT_BG[it.type] || "loop:5djr6ofyLLY", font: it.font || (it.type === "sermon" ? "serif" : "grotesk") });
  const name = (it) => (window.XL && XL.types && XL.types[it.type] ? XL.types[it.type].name : it.type);
  /* template do item (sem música e sem vídeo/áudio); slide k usa os textos/fundo próprios daquele slide, se houver */
  function tpl(it, k = 0) {
    const s = (it.slides && it.slides[k]) || {};
    const base = { kind: name(it), eyebrow: it.eyebrow || name(it), title: it.title, text: it.type === "wait" ? it.text || "" : (it.text || "").replace(/ · /g, "\n"), seconds: it.type === "wait" ? it.planned : 0, layout: (it.per && it.per[k]) || it.layout, ink: it.ink, fx: it.fx || null, frame: it.frame || null, vloop: it.vloop, poster: it.poster, ...look(it) };
    // slides próprios do item (ex. "O que é o Cafofo" em vários slides): cada um com os textos, o fundo e a cor dele
    if ((k > 0 || (it.slides && it.slides.length)) && (s.title || s.text || s.bg || s.image || s.eyebrow)) Object.assign(base, { title: s.title ?? base.title, text: s.text ?? "", ...(s.eyebrow != null ? { eyebrow: s.eyebrow } : {}), ...(s.bg ? { bg: s.bg, fx: s.fx || null } : {}), ...(s.image ? { image: s.image } : {}), ...(s.ink ? { ink: s.ink } : {}), ...(s.fx ? { fx: s.fx } : {}), ...(s.vloop != null ? { vloop: s.vloop } : {}), ...(s.poster ? { poster: s.poster } : {}) });
    if (base.frame && it.slides && it.slides.length > 1) base.frame = { ...base.frame, page: `${k + 1} / ${it.slides.length}` };
    return base;
  }
  /* o item tem visual próprio para desenhar com o template? (fundo, layout, fonte, ajuste) */
  const designed = (it) => it && !["song", "media"].includes(it.type);
  return { DEFAULT_BG, look, tpl, designed };
})();

window.paintSlide = function (el, it, slide, T, lang, status) {
  // antes do play, a tela já mostra o primeiro item pronto (ex. a contagem cheia, esperando começar)
  if (status === "idle" && it) status = "live";
  // Música com o look do Estúdio (fundo, fonte, posição), quando look.js está na página.
  if (window.XLOOK && it && it.type === "song" && status !== "idle" && status !== "done") {
    const key = `song|${it.song}|${slide}|${lang}`;
    if (el._k === key) return;
    el._k = key; el._c = "song";
    el.className = "slide song";
    XLOOK.mount(el, XLOOK.songSlide(it.song, slide, { lang }));
    return;
  }
  // aviso, oração, sermão, espera, pausa…: o mesmo template da gaveta do Programa (fundo importado, fonte, layout, ajuste)
  const pg = it && window.LIVE && it.type !== "song" ? LIVE.slidesOf(it)[slide] : null;
  if (window.DRAWER && ITEMLOOK.designed(it) && status !== "idle" && status !== "done" && !(pg && pg.image)) {
    const o = ITEMLOOK.tpl(it, slide), left = o.seconds ? Math.max(0, Math.round((T && T.remaining) || 0)) : 0;
    const key = "tpl|" + JSON.stringify({ ...o, seconds: !!o.seconds }) + "|" + slide;
    if (el._k === key) { const tm = el.querySelector(".tpl-timer"); if (tm && tm.firstChild) tm.firstChild.nodeValue = DRAWER.mmss(left); return; }
    el._k = key; el._c = "tpl";
    el.className = "slide song";
    const html = DRAWER.template({ ...o, left });
    if (window.XLOOK && XLOOK.mount) XLOOK.mount(el, html); else el.innerHTML = html;
    window.MEDIA && MEDIA.hydrate(el);
    return;
  }
  const r = renderSlide(it, slide, T, lang, status);
  const key = r.html;
  if (el._k === key && el._c === r.cls) return;
  el._k = key; el._c = r.cls;
  el.className = "slide" + (r.cls ? " " + r.cls : "");
  el.innerHTML = r.html;
  window.MEDIA && MEDIA.hydrate(el);
};

/* ── transições entre telas (console e projetor usam a mesma) ──
   corte: troca seca · fade: a nova aparece por cima (ease-in-out) · slide: a nova empurra a anterior
   sobrepor: a nova já está atrás e a anterior some por cima.
   Com o mesmo vídeo de fundo, o fundo fica e só o texto faz a transição (o vídeo não recomeça). */
window.TRANSITIONS = [
  ["corte", "Corte seco", "Troca na hora"],
  ["fade", "Fade", "Aparece suave (padrão)"],
  ["slide", "Slide", "A próxima empurra a atual"],
  ["sobrepor", "Sobrepor", "A próxima está atrás; a atual some"],
];
window.TX_MS = 650;
window.paintTransition = function (host, it, slide, T, lang, status, type = "fade") {
  const key = `${it ? it.title : ""}|${slide}|${status}`;
  const mk = () => { const l = document.createElement("div"); l.className = "tx-l"; const s = document.createElement("div"); s.className = "slide"; s.dataset.video = ""; l.append(s); return l; };
  let cur = host._cur;
  if (!cur || !host.contains(cur)) { host.innerHTML = ""; cur = mk(); host.append(cur); host._cur = cur; paintSlide(cur.firstChild, it, slide, T, lang, status); host._key = key; return; }
  if (host._key === key) { paintSlide(cur.firstChild, it, slide, T, lang, status); return; } // só o relógio mudou
  host._key = key;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (type === "corte" || reduce) { host.querySelectorAll(".tx-l").forEach((l) => l !== cur && l.remove()); host.querySelectorAll(".tx-ov").forEach((o) => o.remove()); paintSlide(cur.firstChild, it, slide, T, lang, status); return; }
  // prévia da próxima num layer novo, para saber se o fundo é o mesmo vídeo
  const nxt = mk();
  paintSlide(nxt.firstChild, it, slide, T, lang, status);
  const ytA = cur.querySelector(".xw-yt")?.dataset.yt, ytB = nxt.querySelector(".xw-yt")?.dataset.yt;
  const isBack = (el) => el.matches(".xw-yt, .xw-media, .xw-grain, .xw-shade, .xw");
  if (ytA && ytA === ytB) {
    // mesmo vídeo: o texto antigo vira uma cópia por cima e sai; o novo entra no lugar
    const ov = document.createElement("div"); ov.className = "tx-ov slide song";
    [...cur.firstChild.children].filter((c) => !isBack(c)).forEach((c) => ov.append(c.cloneNode(true)));
    host.append(ov);
    paintSlide(cur.firstChild, it, slide, T, lang, status);
    const fresh = [...cur.firstChild.children].filter((c) => !isBack(c));
    fresh.forEach((c) => { c.classList.remove("tx-in-fade", "tx-in-slide", "tx-in-sobrepor"); void c.offsetWidth; c.classList.add("tx-in-" + type); });
    ov.classList.add("tx-out-" + type);
    setTimeout(() => { ov.remove(); fresh.forEach((c) => c.classList.remove("tx-in-" + type)); }, TX_MS + 50);
    return;
  }
  host.querySelectorAll(".tx-l").forEach((l) => l !== cur && l.remove());
  if (type === "sobrepor") { host.insertBefore(nxt, cur); cur.classList.add("tx-out-sobrepor"); }
  else { host.append(nxt); nxt.classList.add("tx-in-" + type); if (type === "slide") cur.classList.add("tx-out-slide"); }
  window.XLOOK && XLOOK.hydrate && XLOOK.hydrate(nxt);
  host._cur = nxt;
  const old = cur;
  setTimeout(() => { old.remove(); nxt.classList.remove("tx-in-" + type); }, TX_MS + 50);
};
