/* XLIDE v2 · o que a tela mostra para cada tipo de item (console, tela e página pública usam o mesmo).
   No app real: SlideView do XLIDE para decks/letras + layouts novos "wait", "pause", "sermon". */
window.renderSlide = function (it, slide, T, lang = "pt", status = "live") {
  if (status === "idle") return { cls: "blank", html: `<div class="s-eyebrow">XLIDE · Nova Semente</div><div class="s-title" style="opacity:.25">●</div>` };
  if (status === "done") return { cls: "blank", html: `<div class="s-eyebrow">Obrigado por estar aqui</div><div class="s-title">Até sábado.</div>` };
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
    case "pause":
      return { cls: "blank", html: `<div class="s-eyebrow" style="opacity:.3">XLIDE</div>` };
    default:
      return { html: `<div><div class="s-eyebrow">${XL.types[it.type].name}</div><div class="s-title">${it.title}</div></div>` };
  }
};
window.paintSlide = function (el, it, slide, T, lang, status) {
  const r = renderSlide(it, slide, T, lang, status);
  const key = r.html;
  if (el._k === key && el._c === r.cls) return;
  el._k = key; el._c = r.cls;
  el.className = "slide" + (r.cls ? " " + r.cls : "");
  el.innerHTML = r.html;
};
