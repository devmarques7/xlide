/* XLIDE v2 · Meus arquivos: atalhos de pasta, cartão de arquivo e prévia.
   Usado em arquivos.html e no Início. Os dados e as pastas moram em FILES (shell.js). */
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const KIND = { avisos: "Deck de avisos", pregacao: "Deck de pregação", inicio: "Abertura", oracao: "Oração", versiculo: "Versículo" };

  /* Pasta: desenho de pasta reto (sem raio), com a contagem dentro. */
  const folderSVG = (n, tone = "") => `<svg class="fd-ic ${tone}" viewBox="0 0 96 72" aria-hidden="true"><path class="fd-back" d="M0 6h36l6 7h54v59H0z"/><path class="fd-front" d="M0 20h96v52H0z"/>${n != null ? `<text x="88" y="64" text-anchor="end">${n}</text>` : ""}</svg>`;

  /* Fila de atalhos: Tudo + pastas + Padrão, Arquivados, Lixeira. */
  function shortcuts(on, { all = true, href = (k) => `arquivos.html?pasta=${k}` } = {}) {
    const c = FILES.counts(), act = FILES.mine().filter((f) => f.status === "ativo").length;
    const cell = (k, n, d, cnt, tone) => `<a class="fd${on === k ? " on" : ""}" href="${k === "tudo" ? "arquivos.html" : href(k)}" data-drop="${k}" title="${esc(d)}">${folderSVG(cnt, tone)}<b>${n}</b><small>${cnt} ${cnt === 1 ? "arquivo" : "arquivos"}</small></a>`;
    return `<div class="fds">${all ? cell("tudo", "Tudo", "Todos os arquivos ativos", act, "all") : ""}${FILES.FOLDERS.map(([k, n, d]) => cell(k, n, d, c[k] || 0)).join("")}<span class="fd-sep" aria-hidden="true"></span>${FILES.STATUS.map(([k, n, d]) => cell(k, n, d, c[k] || 0, k)).join("")}</div>`;
  }

  const avatars = (f) => [f.owner, ...f.shared].slice(0, 4).map((k) => `<span class="av" title="${esc(XL.people[k]?.name)}">${XL.people[k]?.ini || "?"}</span>`).join("");
  const folderName = (k) => (FILES.FOLDERS.find((x) => x[0] === k) || [k, k])[1];
  const statusName = (f) => ({ padrao: "Padrão", arquivado: "Arquivado", lixeira: "Na lixeira" })[f.status] || "";

  /* Cartão de arquivo (como na referência: estrela, menu, prévia, nome, rodapé com pessoas). */
  function card(f, sel) {
    return `<article class="fl${sel ? " on" : ""}${f.status !== "ativo" ? " " + f.status : ""}" data-id="${f.id}" draggable="true" tabindex="0" aria-label="${esc(f.name)}">
      <div class="fl-top"><button class="fl-star${f.star ? " on" : ""}" data-star="${f.id}" aria-pressed="${!!f.star}" aria-label="Favorito">${UI.I.star}</button><span class="lbl">${statusName(f) || folderName(f.folder)}</span><button class="fl-more" data-more="${f.id}" aria-label="Mais ações">${UI.I.more}</button></div>
      <div class="fl-pv">${DRAWER.mini({ ...f, seconds: 0 })}</div>
      <h3>${esc(f.name)}</h3>
      <div class="fl-foot"><span>${f.slides} ${f.slides === 1 ? "slide" : "slides"} · ${f.status === "lixeira" ? "excluído " + (f.deleted || "agora") : f.updated}</span><span class="avs">${avatars(f)}</span></div>
    </article>`;
  }

  window.FILEUI = { shortcuts, card, folderSVG, folderName, statusName, avatars, KIND, esc };
})();
