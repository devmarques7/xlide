/* XLIDE v2 · aparência dos slides (o "look" de cada música), com os mesmos
   fundos, loops e fontes do XLIDE (src/slides/lyrics.tsx, src/lib/song-style.ts).
   Um look por música (viaja com ela de programa em programa) e ajustes por slide.
   No app real: Presentation.music + Slide.bg/font no doc do xlide_decks. */
(function () {
  if (!window.MEDIA && !document.querySelector('script[src$="media.js"]')) document.write('<script src="assets/media.js"><\/script>');
  const WASHES = [
    { id: "ember", name: "Ember", base: "#040302", c: ["#ff6a1a", "#c2410c", "#5b6b7a", "#1a0a05"], streak: "#ff8a3d" },
    { id: "amber", name: "Amber", base: "#2a0d02", c: ["#ffb020", "#ff6a00", "#c2280c", "#3a1004"] },
    { id: "crimson", name: "Crimson", base: "#2a0008", c: ["#ff1744", "#ff5a7a", "#b0003a", "#ff8a3d"] },
    { id: "dusk", name: "Dusk", base: "#050507", c: ["#ff4d1a", "#1e3a8a", "#7f1d1d", "#0b0b10"], streak: "#ff6a3d" },
    { id: "ocean", name: "Ocean", base: "#01131c", c: ["#00b4d8", "#0077b6", "#023e8a", "#00303f"] },
    { id: "midnight", name: "Midnight", base: "#020617", c: ["#1e40af", "#1d4ed8", "#0b1d4f", "#000000"], streak: "#3b82f6" },
    { id: "teal", name: "Teal", base: "#031a1e", c: ["#0e7490", "#22d3ee", "#134e4a", "#0f172a"] },
    { id: "mist", name: "Mist", base: "#8fb3ad", c: ["#e6f4f1", "#6fa8a0", "#bfe3dc", "#4d7c74"], ink: "#0f1f1c" },
    { id: "gold", name: "Gold", base: "#0d0a05", c: ["#f5c26b", "#a16207", "#3b2a12", "#000000"], streak: "#f5c26b" },
  ];
  // Loops da playlist "Worship Backgrounds" que o XLIDE já usa (ids reais do lyrics.tsx).
  const LOOPS = [
    { id: "5djr6ofyLLY", name: "Light Rings" }, { id: "DCBMIg4Yoq8", name: "Abstract Glass" },
    { id: "1krnHdrN6q0", name: "Gradient" }, { id: "w4BuwIA-vg0", name: "Glow" },
    { id: "ciD38DyxEC4", name: "Flower Blur" }, { id: "CQ0keZI1gds", name: "Clouds in Arch" },
    { id: "oCZtyFfds-o", name: "Retro Grid" }, { id: "jT9IykfTWy0", name: "Easter Cross" },
  ];
  const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const FONTS = [
    { id: "grotesk", name: "Grotesk", family: 'var(--font)', weight: 600, track: "-0.02em", lh: 1.08, k: 1 },
    { id: "serif", name: "Serif", family: "'Instrument Serif', Georgia, serif", weight: 400, track: "-0.01em", lh: 1.04, k: 1.18 },
    { id: "condensed", name: "Condensed", family: "'Bebas Neue', Impact, sans-serif", weight: 400, track: "0.01em", lh: 0.96, k: 1.4, upper: true },
    { id: "mono", name: "Mono", family: "var(--mono)", weight: 400, track: "-0.03em", lh: 1.12, k: 0.82, upper: true },
  ];
  const INKS = ["#f7f6f3", "#161615", "#f5c26b", "#9fd8ff", "#ffb4a2"];
  // Fundos de avisos: planos e calmos, para texto longo (datas, endereços, inscrições).
  const PLAIN = [
    { id: "papel", name: "Papel", css: "#f2f0ea", ink: "#161615" },
    { id: "tinta", name: "Tinta", css: "#161615" },
    { id: "grade", name: "Grade", css: "linear-gradient(#0000 calc(100% - 1px), rgb(22 22 21 / .09) 0) 0 0 / 6% 10.6%, linear-gradient(90deg, #0000 calc(100% - 1px), rgb(22 22 21 / .09) 0) 0 0 / 6% 10.6%, #efede6", ink: "#161615" },
    { id: "coluna", name: "Coluna", css: "linear-gradient(90deg, #161615 0 36%, #f2f0ea 36%)", ink: "#161615" },
    { id: "sabado", name: "Sábado", css: "linear-gradient(160deg, #1e3a8a, #020617 70%)" },
    { id: "brasa", name: "Brasa", css: "linear-gradient(200deg, #7c2d12, #1a0a05 65%)" },
  ];

  const DEFAULTS = {
    s1: { bg: "loop:5djr6ofyLLY", font: "grotesk" },
    s2: { bg: "wash:dusk", font: "condensed" },
    s3: { bg: "wash:amber", font: "grotesk" },
    s4: { bg: "loop:CQ0keZI1gds", font: "serif" },
  };
  const BASE = { bg: "wash:ember", font: "grotesk", ink: "#f7f6f3", size: 1, align: "center", x: 50, y: 50, w: 78, trans: true, image: null, slides: {} };

  const KEY = "xlide.v2.looks";
  let store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  const subs = new Set();
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("xlide-v2-looks") : null;
  bc && (bc.onmessage = (e) => { store = e.data; subs.forEach((f) => f()); });
  addEventListener("storage", (e) => { if (e.key === KEY) { try { store = JSON.parse(e.newValue) || {}; } catch {} subs.forEach((f) => f()); } });

  function get(key) {
    const s = store[key] || {};
    return { ...BASE, ...(DEFAULTS[key] || {}), ...s, slides: { ...(s.slides || {}) } };
  }
  function set(key, patch, slide) {
    const cur = store[key] || {};
    if (slide == null) store[key] = { ...cur, ...patch };
    else store[key] = { ...cur, slides: { ...(cur.slides || {}), [slide]: { ...((cur.slides || {})[slide] || {}), ...patch } } };
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
    bc && bc.postMessage(store);
    subs.forEach((f) => f());
  }
  function reset(key) { delete store[key]; try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} bc && bc.postMessage(store); subs.forEach((f) => f()); }

  /* Look efetivo de um slide: o da música + o ajuste daquele slide. */
  function resolve(key, i) {
    const L = get(key);
    return { ...L, ...(L.slides[i] || {}) };
  }

  /* opts.loop: repetir o vídeo (padrão) ou tocar uma vez; opts.play: false = fica a imagem parada */
  function backdrop(bg, image, opts = {}) {
    if (image) return `<img class="xw-media" src="${image}" alt="">`;
    if (bg?.startsWith("loop:")) { const id = bg.slice(5); return `<div class="xw-media xw-yt" data-yt="${id}" data-loop="${opts.loop === false ? 0 : 1}" data-play="${opts.play === false ? 0 : 1}" aria-hidden="true"><img src="${thumb(id)}" alt=""></div>`; }
    if (bg?.startsWith("plain:")) { const p = PLAIN.find((x) => x.id === bg.slice(6)) || PLAIN[0]; return `<div class="xw-media" style="background:${p.css}"></div>`; }
    if (bg?.startsWith("solid:")) return `<div class="xw-media" style="background:${bg.slice(6)}"></div>`;
    const w = WASHES.find((x) => x.id === (bg || "").slice(5)) || WASHES[0];
    return `<div class="xw" style="--w0:${w.base};--w1:${w.c[0]};--w2:${w.c[1]};--w3:${w.c[2]};--w4:${w.c[3]};--ws:${w.streak || "transparent"}"><span></span><span></span><span></span><span></span>${w.streak ? "<i></i>" : ""}</div>`;
  }
  /* Cor de texto que funciona sobre um fundo (claro → tinta escura). */
  const inkOf = (bg) => WASHES.find((x) => "wash:" + x.id === bg)?.ink || PLAIN.find((x) => "plain:" + x.id === bg)?.ink || null;
  const inkFor = (L) => (L.inkSet ? L.ink : inkOf(L.bg) || L.ink);
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

  /* HTML interno de um slide de música (fundo + caixa de texto). */
  function songSlide(songId, i, { lang = "pt", editable = false, section = true } = {}) {
    const sl = XL.songSlides(songId, lang)[i] || { section: "", text: "" };
    const L = resolve(songId, i);
    const F = FONTS.find((f) => f.id === L.font) || FONTS[0];
    const text = L.text ?? sl.text;
    const n = text.split("\n").length;
    // tradução embaixo só quando existe OUTRA língua de verdade (música só em inglês não repete o inglês)
    const ly = XL.songs[songId].lyrics, shown = ly[lang] ? lang : Object.keys(ly)[0], other = shown === "en" ? "pt" : "en";
    const tr = L.trans && other !== shown && ly[other] && ly[other] !== ly[shown] ? XL.songSlides(songId, other)[i]?.text : "";
    const fs = Math.min(6.4, 26 / Math.max(2, n)) * F.k * L.size;
    return `${backdrop(L.bg, L.image)}<div class="xw-grain"></div>
      ${section && sl.section ? `<div class="xw-sec" style="color:${inkFor(L)}">${esc(sl.section)}</div>` : ""}
      <div class="tb" data-i="${i}" style="left:${L.x}%;top:${L.y}%;width:${L.w}%;text-align:${L.align};color:${inkFor(L)};--ff:${F.family};--fw:${F.weight};--tr:${F.track};--lh:${F.lh};--fs:${fs}cqw;${F.upper ? "text-transform:uppercase;" : ""}">
        <div class="tb-lines" ${editable ? 'contenteditable="plaintext-only" spellcheck="false"' : ""}>${esc(text)}</div>
        ${tr ? `<div class="tb-trans">${esc(tr)}</div>` : ""}
        ${editable ? '<span class="tb-h" title="Arraste para mover"></span><span class="tb-r" title="Arraste para a largura"></span>' : ""}
      </div>`;
  }

  /* Loops de vídeo rodando de verdade (mesmo player do XLIDE: src/lib/youtube.ts loopEmbed).
     Só onde o slide anima (.animate ou [data-video]); miniaturas ficam com a imagem parada. */
  const embed = (id, loop = true) => `https://www.youtube.com/embed/${id}?autoplay=1&mute=1${loop ? `&loop=1&playlist=${id}` : ""}&controls=0&disablekb=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3`;
  function hydrate(root = document) {
    window.MEDIA && MEDIA.hydrate(root);
    const list = root.matches?.(".xw-yt") ? [root] : [...root.querySelectorAll(".xw-yt")];
    list.forEach((el) => {
      if (el.querySelector("iframe") || el.dataset.play === "0" || !el.closest(".animate, [data-video]") || el.closest("[data-still]")) return;
      const f = document.createElement("iframe");
      f.src = embed(el.dataset.yt, el.dataset.loop !== "0"); f.title = ""; f.allow = "autoplay; encrypted-media"; f.tabIndex = -1;
      el.append(f);
    });
  }
  /* Troca o conteúdo de um slide sem recarregar o vídeo quando o fundo é o mesmo
     (a letra muda, o loop continua rodando). */
  function mount(el, html) {
    const t = document.createElement("template"); t.innerHTML = html;
    const nb = t.content.firstElementChild, ob = el.firstElementChild;
    const sameYt = ob && nb && ob.classList.contains("xw-yt") && nb.classList.contains("xw-yt") && ob.dataset.yt === nb.dataset.yt && ob.dataset.loop === nb.dataset.loop && ob.dataset.play === nb.dataset.play;
    const sameEmb = ob && nb && ob.dataset.emb && ob.dataset.emb === nb.dataset.emb; // vídeo ou áudio importado: não recarrega
    if (sameYt || sameEmb) {
      while (ob.nextSibling) ob.nextSibling.remove();
      nb.remove(); el.append(t.content);
    } else el.replaceChildren(t.content);
    hydrate(el);
  }

  window.XLOOK = { embed, hydrate, mount, WASHES, LOOPS, PLAIN, FONTS, INKS, inkOf, thumb, get, set, reset, resolve, backdrop, songSlide, on: (f) => (subs.add(f), () => subs.delete(f)) };
})();
