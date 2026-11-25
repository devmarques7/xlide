/* XLIDE v2 · prévias e cartões compartilhados (Início, Boards, Biblioteca).
   Um cartão para cada coisa do XLIDE: moodboard, deck, música. Depende de look.js para as músicas. */
(function () {
  const yt = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const first = (n) => (n.startsWith("Pr.") ? n.split(" ").slice(0, 2).join(" ") : n.split(" ")[0]);

  /* prévias */
  const thumb = (b, k) => (b.thumbs && b.thumbs[k]) || (b.loops && b.loops[k] ? yt(b.loops[k]) : "");
  const pvBoard = (b) => `<div class="pv pv-board"><i class="tall" style="background-image:url(${thumb(b, 0)})"></i><i style="background-image:url(${thumb(b, 1)})"></i><span class="sw3">${b.colors.map((c) => `<i style="background:${c}"></i>`).join("")}</span></div>`;
  const pvDeck = (d) => `<div class="pv"><div class="slide"><div><div class="s-eyebrow">${esc(d.layout)}</div><div class="s-title" style="font-size:8cqw">${esc(d.title)}</div></div></div></div>`;
  const pvSong = (id) => `<div class="pv"><div class="slide song">${window.XLOOK ? XLOOK.songSlide(id, 0, { section: false }) : ""}</div></div>`;

  /* cartão de recente: data · tipo / título / prévia / rodapé */
  function card(kind, id) {
    if (kind === "board") {
      const b = XL.boards[id];
      return `<a class="rc" id="${id}" href="${b.real ? "/b/" + id : "board.html?id=" + id}"><span class="rc-top"><span>${b.when}</span><span>Moodboard</span></span><h3>${esc(b.title)}</h3>${pvBoard(b)}<span class="rc-foot"><span>${b.items} itens</span><span>${b.updated}, ${first(XL.people[b.by].name)}</span></span></a>`;
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
    board: () => pvBoard(XL.boards.b1),
    slides: () => `<div class="pv pv-slide"><div class="slide song animate">${window.XLOOK ? XLOOK.backdrop("wash:ember") : ""}<div class="tb" style="left:50%;top:50%;width:80%;text-align:center;color:#f7f6f3;--ff:var(--font);--fw:700;--tr:-0.03em;--lh:1;--fs:9cqw;text-transform:uppercase"><div class="tb-lines">Casa de muitos</div></div></div></div>`,
    map: () => `<div class="pv"><svg viewBox="0 0 160 120" style="position:absolute;inset:0;width:100%;height:100%" fill="none" stroke="currentColor" stroke-width="1"><path d="M80 60C50 60 50 22 30 22M80 60c30 0 30-38 50-38M80 60c-30 0-30 38-50 38M80 60c30 0 30 38 50 38" stroke-dasharray="3 3" opacity=".6"/><rect x="58" y="48" width="44" height="24" fill="currentColor"/><rect x="12" y="14" width="36" height="16" fill="var(--surface)"/><rect x="112" y="14" width="36" height="16" fill="var(--surface)"/><rect x="12" y="90" width="36" height="16" fill="var(--surface)"/><rect x="112" y="90" width="36" height="16" fill="var(--surface)"/></svg></div>`,
    music: () => `<div class="pv pv-wave">${Array.from({ length: 22 }, (_, k) => `<i class="${k < 9 ? "p" : ""}" style="height:${18 + ((k * 37) % 50)}%"></i>`).join("")}</div>`,
    list: () => `<div class="pv pv-prog">${[70, 46, 88, 60, 34, 74].map((w, k) => `<i class="${k === 2 ? "now" : ""}" style="width:${w}%"></i>`).join("")}</div>`,
  };
  const makeCell = ([ic, n, d, f]) => `<a class="make" href="${f}">${make[ic]()}<span class="mk-t"><b>${n}</b><span>${d}</span></span></a>`;

  window.CARDS = { card, makeCell, pvBoard, pvSong, yt };
})();
