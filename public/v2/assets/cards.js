/* XLIDE v2 · prévias e cartões compartilhados (Início, Boards, Biblioteca).
   Um cartão para cada coisa do XLIDE: moodboard, deck, música. Depende de look.js para as músicas. */
(function () {
  const yt = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const first = (n) => (n.startsWith("Pr.") ? n.split(" ").slice(0, 2).join(" ") : n.split(" ")[0]);

  /* prévias */
  const thumb = (b, k) => (b.thumbs && b.thumbs[k]) || (b.loops && b.loops[k] ? yt(b.loops[k]) : "");
  /* url() segura para data:image/svg (aspas e espaços) dentro de style="" */
  const bg = (s) => (s ? `background-image:url('${String(s).replace(/'/g, "%27").replace(/"/g, "%22").replace(/[\n\r]/g, "")}')` : "");
  const safeC = (c) => (/^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%]+\)|[a-z]+)$/i.test(String(c || "")) ? c : "");
  /* recorte real do moodboard: os itens nas posições do quadro */
  function pvMood(m, cls = "") {
    if (!m || !m.items || !m.items.length) return "";
    const W = m.w || 1000, H = m.h || 1000;
    const cells = m.items.map((i) => {
      const pos = `left:${(i.x / W) * 100}%;top:${(i.y / H) * 100}%;width:${(i.w / W) * 100}%;height:${(i.h / H) * 100}%`;
      if (i.s) return `<i class="mi img" style="${pos};${bg(i.s)}"></i>`;
      if (i.t === "video") return `<i class="mi vid" style="${pos}"></i>`;
      if (i.t === "color" || i.t === "shape") return `<i class="mi" style="${pos};background:${safeC(i.c) || "var(--sunken)"}"></i>`;
      if (i.t === "text") return `<i class="mi tx" style="${pos};color:${safeC(i.c) || "var(--fg)"}"><b>${esc(i.tx)}</b></i>`;
      if (i.t === "note" || i.t === "todo") return `<i class="mi nt" style="${pos}"><b>${esc(i.tx)}</b></i>`;
      return `<i class="mi" style="${pos};background:var(--sunken)"></i>`;
    }).join("");
    return `<div class="pv-mood ${cls}" style="aspect-ratio:${Math.max(0.6, Math.min(2.4, W / H))}"><div class="pv-mood-in">${cells}</div></div>`;
  }
  /* mapa mental real: a ideia no centro e os primeiros ramos em volta */
  function pvMap(m, cls = "mm") {
    if (!m) return "";
    const n = m.around.length, pts = m.around.map((t, k) => { const a = (-Math.PI / 2) + (k / Math.max(n, 1)) * Math.PI * 2; return [t, 100 + Math.cos(a) * 70, 62 + Math.sin(a) * 40]; });
    const w = (t, min) => Math.max(min, Math.min(84, t.length * 3.3 + 10));
    const wc = Math.max(50, Math.min(116, m.center.length * 3.95 + 14));
    return `<svg class="${cls}" viewBox="0 0 200 125" role="img" aria-label="Mapa: ${esc(m.center)}">${pts.map(([, x, y]) => `<path d="M100 62 C ${(100 + x) / 2} 62, ${(100 + x) / 2} ${y}, ${x} ${y}"/>`).join("")}${pts.map(([t, x, y]) => { const ww = w(t, 30); return `<g><rect x="${x - ww / 2}" y="${y - 7}" width="${ww}" height="14"/><text x="${x}" y="${y + 3}" text-anchor="middle">${esc(t)}</text></g>`; }).join("")}<g class="c"><rect x="${100 - wc / 2}" y="53" width="${wc}" height="18"/><text x="100" y="65" text-anchor="middle">${esc(m.center)}</text></g></svg>`;
  }
  const pvBoard = (b) => (b.mood ? `<div class="pv pv-real">${pvMood(b.mood)}</div>` : b.map ? `<div class="pv pv-real">${pvMap(b.map, "mm")}</div>`
    : `<div class="pv pv-board"><i class="tall" style="${bg(thumb(b, 0))}"></i><i style="${bg(thumb(b, 1))}"></i><span class="sw3">${b.colors.map((c) => `<i style="background:${safeC(c)}"></i>`).join("")}</span></div>`);
  const pvDeck = (d) => `<div class="pv"><div class="slide"><div><div class="s-eyebrow">${esc(d.layout)}</div><div class="s-title" style="font-size:8cqw">${esc(d.title)}</div></div></div></div>`;
  /* deck real (xlide_decks): capa como no painel de slides — imagem, título grande, tag */
  const pvDeckReal = (d) => `<div class="pv pv-deck${d.cover ? " img" : ""}${d.tone === "dark" || d.cover ? " dk" : ""}" style="${bg(d.cover)}"><span class="pd-t">${esc(d.title)}</span>${d.tags && d.tags[0] ? `<span class="pd-tag">${esc(d.tags[0])}</span>` : ""}</div>`;
  function deckCard(id) {
    const d = XL.decks[id];
    if (!d.real) return card("deck", id);
    const href = `/p/${encodeURIComponent(id)}`;
    return `<article class="rc rc-deck"><span class="rc-top"><span>${esc(d.updated)}</span><span>${d.slides} slides</span></span><a href="${href}" aria-label="Abrir ${esc(d.title)}">${pvDeckReal(d)}</a><h3><a href="${href}">${esc(d.title)}</a></h3>${d.desc ? `<p class="rc-d">${esc(d.desc)}</p>` : ""}<span class="rc-foot"><span>${(d.langs || []).map((l) => `<i class="lng">${esc(String(l).toUpperCase())}</i>`).join("")}</span><span class="rc-acts"><a href="${href}">Editar</a> · <a href="/present/${encodeURIComponent(id)}">Apresentar</a></span></span></article>`;
  }
  const pvSong = (id) => `<div class="pv"><div class="slide song">${window.XLOOK ? XLOOK.songSlide(id, 0, { section: false }) : ""}</div></div>`;

  /* cartão de recente: data · tipo / título / prévia / rodapé */
  function card(kind, id) {
    if (kind === "board") {
      const b = XL.boards[id];
      return `<a class="rc" id="${id}" href="${b.real ? "/b/" + id + (b.mood ? "?mode=mood" : "") : "board.html?id=" + id}"><span class="rc-top"><span>${b.when}</span><span>${b.real ? (b.moodN && b.nodesN ? "Mapa + moodboard" : b.moodN ? "Moodboard" : "Mapa mental") : "Moodboard"}</span></span><h3>${esc(b.title)}</h3>${pvBoard(b)}<span class="rc-foot"><span>${b.items} itens</span><span>${b.updated}, ${first(XL.people[b.by].name)}</span></span></a>`;
    }
    if (kind === "deck") {
      const d = XL.decks[id];
      return `<a class="rc" href="${d.real ? "deck.html?d=" + id : "estudio.html"}"><span class="rc-top"><span>${String(d.updated || "").split(",")[0]}</span><span>Deck</span></span><h3>${esc(d.title)}</h3>${pvDeck(d)}<span class="rc-foot"><span>${d.slides} slides</span><span>${esc(d.updated)}</span></span></a>`;
    }
    const s = XL.songs[id];
    return `<a class="rc" href="estudio.html?song=${id}"><span class="rc-top"><span>${s.last}</span><span>Música</span></span><h3>${esc(s.title)}</h3>${pvSong(id)}<span class="rc-foot"><span>Tom ${s.key}, ${s.langs.join(" ").toUpperCase()}</span><span>usada ${s.uses}×</span></span></a>`;
  }

  /* prévias vivas das células de criar */
  const make = {
    board: () => pvBoard(Object.values(XL.boards)[0] || XL.boards.b1),
    slides: () => `<div class="pv pv-slide"><div class="slide song animate">${window.XLOOK ? XLOOK.backdrop("wash:ember") : ""}<div class="tb" style="left:50%;top:50%;width:80%;text-align:center;color:#f7f6f3;--ff:var(--font);--fw:700;--tr:-0.03em;--lh:1;--fs:9cqw;text-transform:uppercase"><div class="tb-lines">Casa de muitos</div></div></div></div>`,
    map: () => `<div class="pv"><svg viewBox="0 0 160 120" style="position:absolute;inset:0;width:100%;height:100%" fill="none" stroke="currentColor" stroke-width="1"><path d="M80 60C50 60 50 22 30 22M80 60c30 0 30-38 50-38M80 60c-30 0-30 38-50 38M80 60c30 0 30 38 50 38" stroke-dasharray="3 3" opacity=".6"/><rect x="58" y="48" width="44" height="24" fill="currentColor"/><rect x="12" y="14" width="36" height="16" fill="var(--surface)"/><rect x="112" y="14" width="36" height="16" fill="var(--surface)"/><rect x="12" y="90" width="36" height="16" fill="var(--surface)"/><rect x="112" y="90" width="36" height="16" fill="var(--surface)"/></svg></div>`,
    music: () => `<div class="pv pv-wave">${Array.from({ length: 22 }, (_, k) => `<i class="${k < 9 ? "p" : ""}" style="height:${18 + ((k * 37) % 50)}%"></i>`).join("")}</div>`,
    list: () => `<div class="pv pv-prog">${[70, 46, 88, 60, 34, 74].map((w, k) => `<i class="${k === 2 ? "now" : ""}" style="width:${w}%"></i>`).join("")}</div>`,
  };
  const makeCell = ([ic, n, d, f]) => `<a class="make" href="${f}">${make[ic]()}<span class="mk-t"><b>${n}</b><span>${d}</span></span></a>`;

  window.CARDS = { card, deckCard, pvDeckReal, makeCell, pvBoard, pvMood, pvMap, pvSong, yt, bg };
})();
