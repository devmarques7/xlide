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
      const s = XL.songSlides(it.song, lang)[slide] || { text: "" };
      const tr = lang === "pt" && XL.songs[it.song].lyrics.en ? XL.songSlides(it.song, "en")[slide] : null;
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
      return { cls: "media", html: window.MEDIA ? MEDIA.html(it.media) || `<div class="s-eyebrow">Link não reconhecido</div>` : "" };
    case "pause":
      return { cls: "blank", html: `<div class="s-eyebrow" style="opacity:.3">XLIDE</div>` };
    default:
      return { html: `<div><div class="s-eyebrow">${XL.types[it.type].name}</div><div class="s-title">${it.title}</div></div>` };
  }
};
window.paintSlide = function (el, it, slide, T, lang, status) {
  // Música com o look do Estúdio (fundo, fonte, posição), quando look.js está na página.
  if (window.XLOOK && it && it.type === "song" && status !== "idle" && status !== "done") {
    const key = `song|${it.song}|${slide}|${lang}`;
    if (el._k === key) return;
    el._k = key; el._c = "song";
    el.className = "slide song";
    XLOOK.mount(el, XLOOK.songSlide(it.song, slide, { lang }));
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
