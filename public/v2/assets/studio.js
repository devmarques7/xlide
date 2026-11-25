/* XLIDE v2 · Estúdio de slides de música.
   Canvas editável (texto, imagens, posição), fundos e fontes das músicas do XLIDE (look.js),
   próxima tela, trilha da música com o tempo de cada slide (Slide.at) e ordem das músicas no culto.
   No app real: Editor.tsx (SlideList + SlideFrame + MusicStylePanel/MusicTimePanel) com dnd-kit. */
(function () {
  const $ = UI.qs, $$ = UI.qsa, I = UI.I;
  const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">${d}</svg>`;
  const IC = {
    img: P('<rect x="3" y="4" width="18" height="16"/><circle cx="9" cy="10" r="2"/><path d="m3 18 6-5 4 3 3-2 5 4"/>'),
    text: P('<path d="M5 7V4h14v3M12 4v16M9 20h6"/>'),
    trash: P('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mmss = (t) => { t = Math.max(0, Math.round(t)); return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast("Sem espaço neste navegador. Remova imagens que não usa."); return false; } };
  const uid = () => "e" + Math.random().toString(36).slice(2, 8);

  /* ───────── estado ───────── */
  const songIds = Object.keys(XL.songs);
  const has = (o, k) => k != null && Object.prototype.hasOwnProperty.call(o, k);
  const defSet = [...new Set(XL.program.items.filter((x) => x.type === "song").map((x) => x.song))];
  const S = {
    set: load("xlide.v2.setlist", defSet).filter((id) => has(XL.songs, id)),
    song: null, i: 0, t: 0, playing: false, follow: true,
    mode: "edit", scope: "song", sel: null, editing: false, hold: false,
    tab: "lib", lib: "songs", q: "",
  };
  const qp = new URLSearchParams(location.search).get("song");
  S.song = has(XL.songs, qp) ? qp : S.set[0] || songIds[0];
  if (!S.song) {
    // nenhuma música no banco ainda
    const m = document.querySelector("main") || document.body;
    m.innerHTML = `<div style="padding:48px 24px;display:grid;gap:12px;max-width:520px"><h1>Nenhuma música ainda</h1><p class="muted">Importe a primeira música do YouTube ou cole a letra no XLIDE. Ela aparece aqui para ajustar fundo, fonte e tempos.</p><a class="btn primary" href="/music">Nova música</a></div>`;
    return;
  }

  let AT = load("xlide.v2.at", {});
  let IMGS = load("xlide.v2.images", []);
  const atOf = (id) => AT[id] || XL.songs[id].at;
  const slides = (id) => XL.songSlides(id, "pt");
  const nOf = (id) => slides(id).length;
  const slideAt = (id, t) => { const a = atOf(id); let k = 0; a.forEach((v, j) => { if (v <= t) k = j; }); return k; };
  const textOf = (id, i) => XLOOK.resolve(id, i).text ?? slides(id)[i]?.text ?? "";
  const firstLine = (id, i) => textOf(id, i).split("\n")[0];

  /* ───────── visual (look.js) ───────── */
  // "A música toda" grava no look da música e limpa o mesmo ajuste dos slides; "Só este slide" grava no slide.
  function applyLook(patch, scope = S.scope, i = S.i) {
    if (scope === "song") {
      const keys = Object.keys(patch);
      const clean = {};
      Object.entries(XLOOK.get(S.song).slides).forEach(([k, v]) => { const c = { ...v }; keys.forEach((x) => delete c[x]); clean[k] = c; });
      XLOOK.set(S.song, { ...patch, slides: clean });
    } else XLOOK.set(S.song, patch, i);
  }
  const LOOK_KEYS = ["bg", "image", "font", "size", "align", "ink", "inkSet", "x", "y", "w", "trans"];
  const ownKeys = (i = S.i) => Object.keys(XLOOK.get(S.song).slides[i] || {}).filter((k) => LOOK_KEYS.includes(k));
  function clearSlide(i = S.i) {
    const L = XLOOK.get(S.song);
    const c = { ...(L.slides[i] || {}) };
    LOOK_KEYS.forEach((k) => delete c[k]);
    XLOOK.set(S.song, { slides: { ...L.slides, [i]: c } });
  }
  const bgName = (L) => {
    if (L.image) return "Imagem";
    const [k, v] = (L.bg || "").split(":");
    if (k === "wash") return XLOOK.WASHES.find((w) => w.id === v)?.name || v;
    if (k === "loop") return XLOOK.LOOPS.find((l) => l.id === v)?.name || "Loop";
    return v === "#000" ? "Preto" : "Cor lisa";
  };
  const bgKind = (L) => (L.image ? "Imagem enviada" : L.bg?.startsWith("loop:") ? "Loop em vídeo" : L.bg?.startsWith("wash:") ? "Cor em movimento" : "Cor lisa");
  const inkOf = (L) => (L.inkSet ? L.ink : XLOOK.WASHES.find((w) => "wash:" + w.id === L.bg)?.ink || L.ink);

  // Sugestão pela letra (versão curta de src/lib/song-style.ts)
  const MOODS = [
    { bg: "loop:jT9IykfTWy0", font: "serif", w: "cruz sangue cordeiro calvario" },
    { bg: "loop:5djr6ofyLLY", font: "grotesk", w: "luz gloria brilha manha aurora sol" },
    { bg: "loop:CQ0keZI1gds", font: "serif", w: "ceu santo trono eterno nuvem" },
    { bg: "wash:ember", font: "condensed", w: "fogo espirito chama" },
    { bg: "wash:ocean", font: "serif", w: "agua rio mar chuva" },
    { bg: "wash:midnight", font: "serif", w: "paz descanso abrigo refugio noite" },
    { bg: "loop:1krnHdrN6q0", font: "condensed", w: "alegria cantamos cantar festa mesa chega" },
    { bg: "wash:gold", font: "serif", w: "graca amor fiel bencao casa" },
    { bg: "loop:w4BuwIA-vg0", font: "condensed", w: "forca poder vitoria rei caminho" },
  ];
  function suggest(id) {
    const s = XL.songs[id];
    const words = norm(`${s.title} ${s.title} ${s.lyrics.pt}`).split(/[^a-z]+/);
    let best = MOODS[1], top = 0, hit = [];
    MOODS.forEach((m) => {
      const found = m.w.split(" ").filter((w) => words.includes(w));
      const sc = words.filter((w) => m.w.split(" ").includes(w)).length;
      if (sc > top) { top = sc; best = m; hit = found; }
    });
    return { ...best, hit };
  }

  /* ───────── elementos extras (texto e imagem) ───────── */
  const els = (id = S.song, i = S.i) => {
    const L = XLOOK.get(id);
    return [...(L.els || []).map((e) => ({ ...e, scope: "song" })), ...((L.slides[i] || {}).els || []).map((e) => ({ ...e, scope: "slide" }))];
  };
  function setEls(scope, list) {
    const clean = list.map(({ scope: _s, ...e }) => e);
    if (scope === "song") XLOOK.set(S.song, { els: clean }); else XLOOK.set(S.song, { els: clean }, S.i);
  }
  function addEl(el) { const cur = els().filter((e) => e.scope === S.scope); S.sel = el.id; setEls(S.scope, [...cur, { ...el, scope: S.scope }]); }
  function updEl(id, patch) { const e = els().find((x) => x.id === id); if (e) setEls(e.scope, els().filter((x) => x.scope === e.scope).map((x) => (x.id === id ? { ...x, ...patch } : x))); }
  function delEl(id) { const e = els().find((x) => x.id === id); if (!e) return; if (S.sel === id) S.sel = null; setEls(e.scope, els().filter((x) => x.scope === e.scope && x.id !== id)); toast("Elemento removido"); }
  const addText = () => addEl({ id: uid(), kind: "text", text: "Novo texto", x: 50, y: 84, w: 60, size: 3.2 });
  const addImage = (src, x = 50, y = 50) => src && addEl({ id: uid(), kind: "image", src, x, y, w: 28 });

  function readImage(file) {
    return new Promise((res) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, 1280 / img.width);
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL("image/webp", 0.82));
        };
        img.onerror = () => res(null);
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  async function storeFiles(files) {
    const out = [];
    for (const f of [...files].filter((f) => f.type.startsWith("image/"))) {
      const src = await readImage(f);
      if (!src) continue;
      IMGS = [src, ...IMGS].slice(0, 12);
      out.push(src);
    }
    if (out.length) { save("xlide.v2.images", IMGS); if (S.lib === "imgs") renderLib(); }
    return out;
  }

  /* ───────── slide (fundo + letra + elementos) ───────── */
  function elsHTML(id, i, editable) {
    const L = XLOOK.resolve(id, i);
    const F = XLOOK.FONTS.find((f) => f.id === L.font) || XLOOK.FONTS[0];
    return els(id, i).map((e) => `<div class="el el-${e.kind}${editable && S.sel === e.id ? " sel" : ""}" data-el="${e.id}" style="left:${e.x}%;top:${e.y}%;width:${e.w}%">${
      e.kind === "image"
        ? `<img src="${e.src}" alt="">`
        : `<div class="el-t" style="font-family:${F.family};font-weight:${F.weight};letter-spacing:${F.track};color:${inkOf(L)};font-size:${e.size}cqw;text-align:${e.align || "center"};${F.upper ? "text-transform:uppercase;" : ""}">${esc(e.text)}</div>`
    }${editable ? '<span class="el-r" title="Arraste para mudar o tamanho"></span>' : ""}</div>`).join("");
  }
  const slideHTML = (id, i, editable = false) =>
    XLOOK.songSlide(id, i, { editable }) + elsHTML(id, i, editable) + (editable ? '<i class="guide gv"></i><i class="guide gh"></i>' : "");
  const thumb = (id, i) => `<div class="slide song">${slideHTML(id, i)}</div>`;

  /* ───────── render ───────── */
  const stage = $("#stage");
  function renderCanvas(fade = false) {
    if (S.editing) return;
    const edit = S.mode === "edit";
    const html = slideHTML(S.song, S.i, edit);
    const layer = stage.children.length === 1 ? stage.firstElementChild : null;
    const sameBg = layer && layer.firstElementChild?.dataset?.yt && html.includes(`data-yt="${layer.firstElementChild.dataset.yt}"`);
    if (sameBg) XLOOK.mount(layer, html); // mesmo loop: troca só a letra, o vídeo continua rodando
    else if (fade && stage.firstElementChild) {
      const old = [...stage.children];
      const n = document.createElement("div");
      n.className = "slide song animate layer";
      n.style.opacity = 0;
      n.innerHTML = html;
      stage.append(n); XLOOK.hydrate(n);
      requestAnimationFrame(() => requestAnimationFrame(() => (n.style.opacity = 1)));
      setTimeout(() => old.forEach((o) => o.remove()), 520);
    } else { stage.innerHTML = `<div class="slide song animate layer">${html}</div>`; XLOOK.hydrate(stage); }
    if (edit && S.sel === "tb") $(".tb", stage)?.classList.add("sel");
  }

  function after(id, i, k) {
    let s = id, j = i;
    for (let m = 0; m < k; m++) {
      if (j < nOf(s) - 1) j++;
      else { const p = S.set.indexOf(s); if (p < 0 || p >= S.set.length - 1) return null; s = S.set[p + 1]; j = 0; }
    }
    return { s, j };
  }
  function renderNext() {
    const card = (lb, x) => x
      ? `<button class="nx" data-go-s="${x.s}" data-go-j="${x.j}">${thumb(x.s, x.j)}<span class="nx-cap"><span class="lbl">${lb}${x.s !== S.song ? ", " + esc(XL.songs[x.s].title) : ""}</span><span class="nx-line">${esc(firstLine(x.s, x.j))}</span></span></button>`
      : `<div class="nx empty"><span class="lbl">${lb}</span><span class="muted">${S.set.includes(S.song) ? "Fim das músicas do culto" : "Esta música não está na ordem do culto"}</span></div>`;
    $("#next").innerHTML = card("Próxima", after(S.song, S.i, 1)) + card("Depois", after(S.song, S.i, 2));
  }

  function waveSVG(id) {
    const s = XL.songs[id], a = atOf(id), sl = slides(id), N = 180;
    let seed = Math.abs([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) || 1;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let r = "";
    for (let k = 0; k < N; k++) {
      const t = ((k + 0.5) / N) * s.dur;
      const sec = norm(sl[slideAt(id, t)]?.section || "");
      let e = t < a[0] ? 0.2 + 0.3 * (t / a[0]) : /refr|chorus|refrein/.test(sec) ? 0.92 : /ponte|bridge/.test(sec) ? 0.74 : 0.56;
      const tail = s.dur - t;
      if (tail < 14) e *= Math.max(0.12, tail / 14);
      const h = Math.max(2, e * (0.5 + 0.5 * rnd()) * 40);
      r += `<rect x="${((k / N) * 1000).toFixed(1)}" y="${(20 - h / 2).toFixed(1)}" width="${((1000 / N) * 0.6).toFixed(2)}" height="${h.toFixed(1)}"/>`;
    }
    return `<svg viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true">${r}</svg>`;
  }
  function renderTimeline() {
    const id = S.song, dur = XL.songs[id].dur, a = atOf(id), sl = slides(id);
    const pc = (t) => ((t / dur) * 100).toFixed(3) + "%";
    const ruler = Array.from({ length: Math.floor(dur / 30) + 1 }, (_, k) => `<span style="left:${pc(k * 30)}">${mmss(k * 30)}</span>`).join("");
    const segs = a.map((st, i) => {
      const en = i < a.length - 1 ? a[i + 1] : dur;
      return `<div class="tl-seg${i === S.i ? " on" : ""}" role="button" tabindex="0" data-i="${i}" style="left:${pc(st)};width:${pc(en - st)}" aria-label="Slide ${i + 1}, entra em ${mmss(st)}">${thumb(id, i)}<span class="tl-cap"><b>${esc(sl[i].section || "Slide " + (i + 1))}</b><span>${esc(firstLine(id, i))}</span></span></div>`;
    }).join("");
    const knobs = a.map((st, i) => `<span class="tl-knob" data-k="${i}" style="left:${pc(st)}" title="Arraste para mudar quando o slide ${i + 1} entra"></span>`).join("");
    $("#tl").innerHTML = `<div class="tl-ruler">${ruler}</div><div class="tl-slides"><div class="tl-intro" style="left:0;width:${pc(a[0])}">intro</div>${segs}${knobs}</div><div class="tl-wave">${waveSVG(id)}<div class="tl-played" id="played">${waveSVG(id)}</div></div><div class="tl-head" id="head"><span id="head-t"></span></div>`;
    paintHead();
  }
  function paintHead() {
    const p = ((S.t / XL.songs[S.song].dur) * 100).toFixed(3) + "%";
    const h = $("#head");
    if (h) { h.style.left = p; $("#head-t").textContent = mmss(S.t); }
    $("#played")?.style.setProperty("--p", p);
    $("#time").textContent = mmss(S.t);
  }
  function renderTransport() {
    $("#play").innerHTML = S.playing ? I.pause : I.play;
    $("#play").setAttribute("aria-label", S.playing ? "Pausar" : "Tocar");
    $("#dur").textContent = "/ " + mmss(XL.songs[S.song].dur);
    $("#follow").classList.toggle("on", S.follow);
    $("#follow").setAttribute("aria-checked", S.follow);
  }

  function renderHead() {
    const s = XL.songs[S.song];
    $("#song-title").textContent = s.title;
    $("#song-meta").textContent = `Tom ${s.key}, ${s.bpm} bpm, ${mmss(s.dur)}. ${s.author}`;
    document.title = `XLIDE v2 · Estúdio · ${s.title}`;
  }
  function renderWhere() {
    const sec = slides(S.song)[S.i]?.section;
    $("#where").textContent = `Slide ${S.i + 1} de ${nOf(S.song)}${sec ? ", " + sec : ""}`;
  }

  /* biblioteca */
  function bgTile(bg, name, L) {
    const on = !L.image && L.bg === bg;
    return `<button class="bg-t${on ? " on" : ""}" draggable="true" data-bg="${bg}" aria-pressed="${on}"><div class="slide song">${XLOOK.backdrop(bg)}</div><small>${name}</small></button>`;
  }
  function renderLib() {
    $$("#libtabs button").forEach((b) => b.classList.toggle("on", b.dataset.l === S.lib));
    const L = XLOOK.resolve(S.song, S.i);
    const box = $("#libbody");
    if (S.lib === "songs") {
      box.innerHTML = `<div class="search lib-search">${I.search}<input class="input" id="q" placeholder="Buscar título ou trecho da letra" value="${esc(S.q)}" aria-label="Buscar música"></div><div id="songlist"></div>`;
      $("#q").oninput = (e) => { S.q = e.target.value; renderSongList(); };
      renderSongList();
    } else if (S.lib === "bgs") {
      box.innerHTML = `<div class="lib-h"><h3>Loops do XLIDE</h3></div><div class="bg-grid">${XLOOK.LOOPS.map((l) => bgTile("loop:" + l.id, l.name, L)).join("")}</div>
        <div class="lib-h"><h3>Cores em movimento</h3></div><div class="bg-grid">${XLOOK.WASHES.map((w) => bgTile("wash:" + w.id, w.name, L)).join("")}${bgTile("solid:#000", "Preto", L)}</div>
        <p class="hint">Clique para aplicar. Arraste até o canvas, ou até um slide da trilha para trocar só aquele slide.</p>`;
    } else {
      box.innerHTML = `<div class="bg-grid" style="margin-top:var(--s3)"><button class="up" id="up">${IC.img}<span>Enviar imagem<br>ou soltar aqui</span></button>${IMGS.map((src, k) => `<div class="bg-t img-t" draggable="true" data-img="${k}"><div class="slide"><img src="${src}" alt="Imagem ${k + 1}"></div><span class="row"><button class="link" data-img-add="${k}">No slide</button><button class="link" data-img-bg="${k}">Fundo</button><button class="link" data-img-rm="${k}" aria-label="Remover imagem">Remover</button></span></div>`).join("")}</div>
        <p class="hint">Arraste uma imagem até o canvas para colocá-la onde soltar. Neste mockup as imagens ficam no navegador; no app vão para o Storage.</p>`;
    }
  }
  function renderSongList() {
    const q = norm(S.q);
    $("#songlist").innerHTML = songIds.filter((id) => { const s = XL.songs[id]; return !q || norm(`${s.title} ${s.author} ${Object.values(s.lyrics).join(" ")}`).includes(q); })
      .map((id) => {
        const s = XL.songs[id], inSet = S.set.includes(id);
        return `<div class="lib-song${id === S.song ? " cur" : ""}" draggable="true" data-song="${id}"><span class="k">${s.key}</span><button class="lib-open" data-open="${id}"><b>${esc(s.title)}</b><small>${esc(s.author)}, ${mmss(s.dur)}</small></button><button class="add" data-add="${id}" ${inSet ? "disabled" : ""} aria-label="${inSet ? "Já está na ordem do culto" : "Pôr na ordem do culto"}" title="${inSet ? "Já está na ordem do culto" : "Pôr na ordem do culto"}">${inSet ? I.check : I.plus}</button></div>`;
      }).join("") || `<p class="hint">Nenhuma música com “${esc(S.q)}”. Busque por outro trecho.</p>`;
  }
  function renderSet() {
    $("#set").innerHTML = S.set.map((id, k) => {
      const s = XL.songs[id];
      return `<li class="set-i${id === S.song ? " cur" : ""}" data-k="${k}"><span class="grip" title="Arraste para mudar a ordem">${I.grip}</span><span class="set-n">${k + 1}</span><button class="set-t" data-open="${id}"><b>${esc(s.title)}</b><span>Tom ${s.key}, ${mmss(s.dur)}</span></button><button class="set-x" data-rm="${k}" aria-label="Tirar ${esc(s.title)} do culto">${I.x}</button></li>`;
    }).join("") || `<li class="set-empty">Nenhuma música ainda. Arraste da biblioteca ou toque em +.</li>`;
    $("#set-total").textContent = mmss(S.set.reduce((a, id) => a + XL.songs[id].dur, 0));
    save("xlide.v2.setlist", S.set);
  }

  /* inspetor: estilo */
  function renderStyle() {
    if (S.hold) return;
    const L = XLOOK.resolve(S.song, S.i), s = XL.songs[S.song], own = ownKeys();
    const sg = suggest(S.song);
    const sgOn = L.bg === sg.bg && L.font === sg.font && !L.image;
    const col = L.x < 40 ? 0 : L.x > 60 ? 2 : 1, row = L.y < 40 ? 0 : L.y > 60 ? 2 : 1;
    const range = (id, label, v, min, max, step, out) => `<label class="ctl"><span>${label}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${out}</output></label>`;
    $("#p-style").innerHTML = `
      <div class="ig"><div class="ig-h"><h3>As mudanças valem para</h3></div>
        <div class="seg" id="scope"><button data-sc="song" class="${S.scope === "song" ? "on" : ""}">A música toda</button><button data-sc="slide" class="${S.scope === "slide" ? "on" : ""}">Só o slide ${S.i + 1}</button></div>
        <p class="hint">${S.scope === "song" ? "O visual da música vai junto com ela para os próximos cultos." : "Use para destacar um slide, como o refrão ou a ponte."}</p>
        ${own.length ? `<div class="own"><span>O slide ${S.i + 1} tem ajustes próprios.</span><button class="link" data-act="clear-slide">Seguir a música</button></div>` : ""}
      </div>
      <div class="ig"><div class="ig-h"><h3>Fundo</h3><button class="link" data-act="bgs">Ver todos</button></div>
        <div class="bg-now"><div class="slide song">${XLOOK.backdrop(L.bg, L.image)}</div><span><b>${esc(bgName(L))}</b><span class="hint" style="margin:0">${bgKind(L)}</span></span></div>
        ${sgOn ? `<p class="hint">Este é o visual sugerido pela letra.</p>` : `<p class="hint">Pela letra${sg.hit.length ? ` (${sg.hit.slice(0, 3).join(", ")})` : ""}: <button class="link" data-act="suggest">${esc(bgName({ bg: sg.bg }))} com ${XLOOK.FONTS.find((f) => f.id === sg.font).name}</button></p>`}
      </div>
      <div class="ig"><div class="ig-h"><h3>Tipografia</h3></div>
        <div class="fonts">${XLOOK.FONTS.map((f) => `<button class="font-o${f.id === L.font ? " on" : ""}" data-font="${f.id}" aria-pressed="${f.id === L.font}"><span class="aa" style="font-family:${f.family};font-weight:${f.weight}">${f.upper ? "AA" : "Aa"}</span><small>${f.name}</small></button>`).join("")}</div>
        ${range("r-size", "Tamanho", L.size, 0.6, 1.6, 0.05, Math.round(L.size * 100) + "%")}
        <div class="ctl"><span>Alinhar</span><div class="seg" id="align" style="grid-column:span 2">${[["left", "Esquerda"], ["center", "Centro"], ["right", "Direita"]].map(([v, n]) => `<button data-align="${v}" class="${L.align === v ? "on" : ""}">${n}</button>`).join("")}</div></div>
        <div class="ctl"><span>Cor</span><div class="inks" style="grid-column:span 2"><button class="sw auto${L.inkSet ? "" : " on"}" data-ink="auto">Auto</button>${XLOOK.INKS.map((c) => `<button class="sw${L.inkSet && L.ink === c ? " on" : ""}" data-ink="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join("")}</div></div>
        ${s.lyrics.en ? `<label class="ctl" style="cursor:pointer"><span>Tradução</span><span class="muted" style="font-size:var(--t-xs)">Inglês embaixo da letra</span><button class="toggle${L.trans ? " on" : ""}" data-act="trans" role="switch" aria-checked="${!!L.trans}" aria-label="Mostrar tradução"></button></label>` : ""}
      </div>
      <div class="ig"><div class="ig-h"><h3>Posição do texto</h3><button class="link" data-act="center">Centralizar</button></div>
        <div class="pos"><div class="anchor" aria-label="Posição">${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<button data-anchor="${c},${r}" class="${c === col && r === row ? "on" : ""}" aria-label="Posição ${r * 3 + c + 1}"></button>`).join("")).join("")}</div>
          <p class="hint" style="margin:0">Ou arraste o texto no canvas. As linhas azuis aparecem quando ele fica no centro.</p></div>
        ${range("r-w", "Largura", L.w, 30, 100, 1, Math.round(L.w) + "%")}
      </div>
      <div class="ig"><button class="btn ghost block" data-act="reset">Restaurar o visual original da música</button></div>`;
    bindRange("#r-size", (v) => applyLook({ size: v }), (v) => Math.round(v * 100) + "%");
    bindRange("#r-w", (v) => applyLook({ w: v }), (v) => Math.round(v) + "%");
  }
  function bindRange(sel, fn, fmt) {
    const el = $(sel);
    if (!el) return;
    el.oninput = () => { S.hold = true; el.nextElementSibling.textContent = fmt(+el.value); fn(+el.value); };
    el.onchange = () => { S.hold = false; renderStyle(); renderText(); };
  }

  /* inspetor: texto e elementos */
  function renderText() {
    if (S.hold) return;
    const ta = $("#txt");
    if (ta && document.activeElement === ta) return;
    const L = XLOOK.resolve(S.song, S.i), list = els(), sel = list.find((e) => e.id === S.sel);
    $("#p-text").innerHTML = `
      <div class="ig"><div class="ig-h"><h3>Texto do slide ${S.i + 1}</h3>${L.text != null ? '<button class="link" data-act="orig">Voltar à letra</button>' : ""}</div>
        <textarea class="textarea" id="txt" style="min-height:112px" aria-label="Texto do slide">${esc(textOf(S.song, S.i))}</textarea>
        <p class="hint">Também dá para clicar duas vezes no texto do canvas e digitar ali. A letra da música não muda, só este slide.</p></div>
      <div class="ig"><div class="ig-h"><h3>Elementos no slide</h3></div>
        <div class="grid grid-2"><button class="btn ghost" data-act="add-text">${IC.text} Texto</button><button class="btn ghost" data-act="add-img">${IC.img} Imagem</button></div>
        ${list.length ? `<ul class="el-list">${list.map((e) => `<li data-el-sel="${e.id}" class="${e.id === S.sel ? "on" : ""}">${e.kind === "image" ? IC.img : IC.text}<span>${e.kind === "image" ? "Imagem" : esc(e.text.split("\n")[0])}</span><span class="chip">${e.scope === "song" ? "todos os slides" : "só este"}</span><button class="del" data-el-del="${e.id}" aria-label="Remover elemento">${IC.trash}</button></li>`).join("")}</ul>` : `<p class="hint">Um logo, um versículo ou o nome de quem canta. Novos elementos seguem a opção “As mudanças valem para”.</p>`}
      </div>
      ${sel ? `<div class="ig"><div class="ig-h"><h3>${sel.kind === "image" ? "Imagem" : "Texto"} selecionado</h3><button class="link" data-act="el-center">Centralizar</button></div>
        ${sel.kind === "text" ? `<label class="ctl"><span>Tamanho</span><input type="range" id="r-els" min="1.4" max="10" step="0.1" value="${sel.size}"><output>${sel.size}</output></label>` : ""}
        <label class="ctl"><span>Largura</span><input type="range" id="r-elw" min="8" max="100" step="1" value="${sel.w}"><output>${Math.round(sel.w)}%</output></label>
        ${sel.kind === "image" ? `<button class="btn ghost block" style="margin-top:var(--s3)" data-act="el-bg">Usar como fundo</button>` : ""}</div>` : ""}`;
    $("#txt").oninput = (e) => XLOOK.set(S.song, { text: e.target.value }, S.i);
    $("#txt").onblur = () => renderText();
    if (sel) {
      bindRangeEl("#r-els", (v) => updEl(sel.id, { size: v }), (v) => v.toFixed(1));
      bindRangeEl("#r-elw", (v) => updEl(sel.id, { w: v }), (v) => Math.round(v) + "%");
    }
  }
  function bindRangeEl(sel, fn, fmt) {
    const el = $(sel);
    if (!el) return;
    el.oninput = () => { S.hold = true; el.nextElementSibling.textContent = fmt(+el.value); fn(+el.value); };
    el.onchange = () => { S.hold = false; renderText(); };
  }

  function refresh() {
    renderCanvas(); renderNext(); renderTimeline(); renderStyle(); renderText(); renderWhere();
    if (S.lib !== "songs") renderLib();
  }
  function renderAll() { renderHead(); renderLib(); renderSet(); refresh(); renderTransport(); }

  let savedT;
  XLOOK.on(() => {
    refresh();
    $("#saved").textContent = "Salvo agora";
    clearTimeout(savedT); savedT = setTimeout(() => ($("#saved").textContent = "Tudo salvo"), 2400);
  });

  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200); }

  /* ───────── navegação ───────── */
  function slideChange(fade = false) { renderCanvas(fade); renderNext(); renderTimeline(); renderStyle(); renderText(); renderWhere(); if (S.lib === "bgs") renderLib(); }
  function go(i, seek = true) {
    S.i = clamp(i, 0, nOf(S.song) - 1); S.sel = null;
    if (seek) S.t = atOf(S.song)[S.i];
    slideChange(S.mode === "preview");
  }
  function openSong(id, j = 0) {
    if (!XL.songs[id]) return;
    S.song = id; S.i = j; S.sel = null; S.t = j ? atOf(id)[j] : 0;
    history.replaceState(null, "", "?song=" + id);
    renderHead(); if (S.lib === "songs") renderSongList(); renderSet(); renderTransport();
    renderCanvas(S.mode === "preview"); renderNext(); renderTimeline(); renderStyle(); renderText(); renderWhere();
  }
  function step(d) {
    if (d > 0) { const x = after(S.song, S.i, 1); if (!x) return toast("Esta é a última tela"); x.s !== S.song ? openSong(x.s, x.j) : go(x.j); }
    else if (S.i > 0) go(S.i - 1);
    else { const p = S.set.indexOf(S.song); if (p > 0) { const s = S.set[p - 1]; openSong(s, nOf(s) - 1); } }
  }
  function seek(t) {
    S.t = clamp(t, 0, XL.songs[S.song].dur);
    if (S.follow) { const ni = slideAt(S.song, S.t); if (ni !== S.i) { S.i = ni; S.sel = null; slideChange(); } }
    paintHead();
  }
  function setMode(m) {
    S.mode = m; S.sel = null;
    document.body.classList.toggle("is-preview", m === "preview");
    document.body.classList.toggle("is-edit", m === "edit");
    $$("#mode button").forEach((b) => b.classList.toggle("on", b.dataset.m === m));
    if (m === "preview") { S.playing = true; S.follow = true; }
    document.activeElement?.blur?.();
    S.editing = false;
    renderTransport(); renderCanvas();
  }

  // relógio da música (simulado: no app é o player do XLIDE Music)
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (S.playing) {
      S.t += dt;
      const dur = XL.songs[S.song].dur, p = S.set.indexOf(S.song);
      if (S.t >= dur) {
        if (p > -1 && p < S.set.length - 1) { openSong(S.set[p + 1]); toast("Próxima música: " + XL.songs[S.song].title); }
        else { S.t = dur; S.playing = false; renderTransport(); }
      } else if (S.follow && !S.editing && !drag) {
        const ni = slideAt(S.song, S.t);
        if (ni !== S.i) { S.i = ni; S.sel = null; slideChange(S.mode === "preview"); }
      }
      paintHead();
    }
    requestAnimationFrame(tick);
  }

  /* ───────── canvas: selecionar, mover, redimensionar, digitar ───────── */
  let drag = null;
  const posOf = (id) => (id === "tb" ? XLOOK.resolve(S.song, S.i) : els().find((x) => x.id === id));
  function select(id) {
    S.sel = id;
    $$(".sel", stage).forEach((x) => x.classList.remove("sel"));
    if (id === "tb") $(".tb", stage)?.classList.add("sel");
    else if (id) $(`[data-el="${id}"]`, stage)?.classList.add("sel");
    renderText();
  }
  stage.addEventListener("pointerdown", (e) => {
    if (S.mode !== "edit" || e.button > 0) return;
    const ce = e.target.closest("[contenteditable]");
    if (ce && document.activeElement === ce) return;
    const box = e.target.closest(".tb, .el");
    if (!box) { document.activeElement?.blur?.(); select(null); return; }
    e.preventDefault();
    const id = box.classList.contains("tb") ? "tb" : box.dataset.el;
    const cur = posOf(id);
    drag = { id, box, mode: e.target.closest(".tb-r, .el-r") ? "resize" : "move", sx: e.clientX, sy: e.clientY, rect: stage.getBoundingClientRect(), ox: cur.x, oy: cur.y, ow: cur.w, moved: false, wasSel: S.sel === id };
    box.setPointerCapture(e.pointerId);
    if (!drag.wasSel) select(id);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
    drag.moved = true;
    const dx = ((e.clientX - drag.sx) / drag.rect.width) * 100, dy = ((e.clientY - drag.sy) / drag.rect.height) * 100;
    if (drag.mode === "move") {
      let x = drag.ox + dx, y = drag.oy + dy;
      const snapX = Math.abs(x - 50) < 1.5, snapY = Math.abs(y - 50) < 2.5;
      if (snapX) x = 50; if (snapY) y = 50;
      drag.nx = clamp(x, 0, 100); drag.ny = clamp(y, 0, 100);
      drag.box.style.left = drag.nx + "%"; drag.box.style.top = drag.ny + "%";
      $(".gv", stage)?.classList.toggle("on", snapX); $(".gh", stage)?.classList.toggle("on", snapY);
    } else {
      drag.nw = clamp(drag.ow + dx * 2, 8, 100);
      drag.box.style.width = drag.nw + "%";
    }
  });
  function endDrag(e) {
    if (!drag) return;
    const d = drag; drag = null;
    $$(".guide", stage).forEach((g) => g.classList.remove("on"));
    if (d.moved) {
      const p = d.mode === "move" ? { x: +d.nx.toFixed(1), y: +d.ny.toFixed(1) } : { w: +d.nw.toFixed(1) };
      d.id === "tb" ? applyLook(p) : updEl(d.id, p);
    } else if (d.wasSel && e?.type === "pointerup") startEdit(d.box, e);
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("dblclick", (e) => { const box = e.target.closest(".tb, .el-text"); if (box && S.mode === "edit") startEdit(box, e); });

  function startEdit(box, e) {
    const t = box.querySelector(".tb-lines, .el-t");
    if (!t) return;
    try { t.contentEditable = "plaintext-only"; } catch { t.contentEditable = "true"; }
    t.spellcheck = false;
    S.editing = true;
    t.focus();
    const r = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (r && t.contains(r.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    const isTb = box.classList.contains("tb");
    t.oninput = () => { const txt = t.innerText.replace(/\n$/, ""); isTb ? XLOOK.set(S.song, { text: txt }, S.i) : updEl(box.dataset.el, { text: txt }); };
    t.onblur = () => { S.editing = false; t.oninput = t.onblur = t.onkeydown = null; refresh(); };
    t.onkeydown = (ev) => { if (ev.key === "Escape") t.blur(); ev.stopPropagation(); };
  }

  // soltar no canvas: fundo, imagem da biblioteca, música ou arquivo do computador
  const dropPoint = (e) => { const r = stage.getBoundingClientRect(); return [clamp(((e.clientX - r.left) / r.width) * 100, 5, 95), clamp(((e.clientY - r.top) / r.height) * 100, 5, 95)]; };
  stage.addEventListener("dragover", (e) => { if (S.mode !== "edit") return; e.preventDefault(); stage.classList.add("drop"); });
  stage.addEventListener("dragleave", (e) => { if (!stage.contains(e.relatedTarget)) stage.classList.remove("drop"); });
  stage.addEventListener("drop", async (e) => {
    e.preventDefault(); stage.classList.remove("drop");
    const dt = e.dataTransfer, [x, y] = dropPoint(e);
    const bg = dt.getData("x-bg"), img = dt.getData("x-img"), song = dt.getData("x-song");
    if (bg) { applyLook({ bg, image: null }); return toast(`Fundo aplicado em ${S.scope === "song" ? "toda a música" : "slide " + (S.i + 1)}`); }
    if (img !== "") return addImage(IMGS[+img], x, y);
    if (song) return openSong(song);
    const srcs = await storeFiles(dt.files);
    srcs.forEach((src, k) => addImage(src, x + k * 4, y + k * 4));
  });

  /* ───────── trilha ───────── */
  const tl = $("#tl");
  let tdrag = null;
  tl.addEventListener("pointerdown", (e) => {
    const area = $(".tl-slides", tl).getBoundingClientRect(), dur = XL.songs[S.song].dur;
    const tAt = (cx) => clamp(((cx - area.left) / area.width) * dur, 0, dur);
    const k = e.target.closest(".tl-knob");
    if (k) { e.preventDefault(); tdrag = { kind: "knob", k: +k.dataset.k, tAt }; tl.setPointerCapture(e.pointerId); k.classList.add("on"); return; }
    if (e.target.closest(".tl-wave")) { tdrag = { kind: "scrub", tAt }; tl.setPointerCapture(e.pointerId); seek(tAt(e.clientX)); return; }
    const sg = e.target.closest(".tl-seg");
    if (sg) go(+sg.dataset.i);
  });
  tl.addEventListener("pointermove", (e) => {
    if (!tdrag) return;
    if (tdrag.kind === "scrub") return seek(tdrag.tAt(e.clientX));
    const a = [...atOf(S.song)], k = tdrag.k, dur = XL.songs[S.song].dur;
    const lo = k ? a[k - 1] + 3 : 2, hi = k < a.length - 1 ? a[k + 1] - 3 : dur - 3;
    const v = Math.round(clamp(tdrag.tAt(e.clientX), lo, hi));
    if (v === a[k]) return;
    a[k] = v; AT[S.song] = a; tdrag.dirty = true;
    renderTimeline(); $(`.tl-knob[data-k="${k}"]`, tl)?.classList.add("on");
  });
  const endT = () => { if (tdrag?.dirty) { save("xlide.v2.at", AT); toast(`Slide ${tdrag.k + 1} entra em ${mmss(atOf(S.song)[tdrag.k])}`); renderTimeline(); } tdrag = null; };
  tl.addEventListener("pointerup", endT);
  tl.addEventListener("pointercancel", endT);
  tl.addEventListener("keydown", (e) => { const sg = e.target.closest(".tl-seg"); if (sg && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); go(+sg.dataset.i); } });
  tl.addEventListener("dragover", (e) => { const sg = e.target.closest(".tl-seg"); $$(".tl-seg.drop", tl).forEach((x) => x !== sg && x.classList.remove("drop")); if (sg && e.dataTransfer.types.includes("x-bg")) { e.preventDefault(); sg.classList.add("drop"); } });
  tl.addEventListener("dragleave", (e) => { if (!tl.contains(e.relatedTarget)) $$(".tl-seg.drop", tl).forEach((x) => x.classList.remove("drop")); });
  tl.addEventListener("drop", (e) => {
    const sg = e.target.closest(".tl-seg"), bg = e.dataTransfer.getData("x-bg");
    if (!sg || !bg) return;
    e.preventDefault();
    applyLook({ bg, image: null }, "slide", +sg.dataset.i);
    toast(`Fundo só no slide ${+sg.dataset.i + 1}`);
  });

  /* ───────── ordem das músicas (arrastar da biblioteca e reordenar) ───────── */
  const setEl = $("#set");
  const insertIndex = (y) => { const rows = $$(".set-i", setEl); for (let k = 0; k < rows.length; k++) { const r = rows[k].getBoundingClientRect(); if (y < r.top + r.height / 2) return k; } return rows.length; };
  function markInsert(k) {
    const rows = $$(".set-i", setEl);
    rows.forEach((r) => r.classList.remove("before", "after"));
    if (!rows.length) return;
    k < rows.length ? rows[k].classList.add("before") : rows[rows.length - 1].classList.add("after");
  }
  function placeSong(id, k) {
    const from = S.set.indexOf(id);
    const list = S.set.filter((x) => x !== id);
    if (from > -1 && from < k) k--;
    list.splice(clamp(k, 0, list.length), 0, id);
    S.set = list; renderSet(); renderNext(); if (S.lib === "songs") renderSongList();
  }
  setEl.addEventListener("dragover", (e) => { if (!e.dataTransfer.types.includes("x-song")) return; e.preventDefault(); setEl.classList.add("drop-zone"); markInsert(insertIndex(e.clientY)); });
  setEl.addEventListener("dragleave", (e) => { if (!setEl.contains(e.relatedTarget)) { setEl.classList.remove("drop-zone"); markInsert(-1); } });
  setEl.addEventListener("drop", (e) => {
    const id = e.dataTransfer.getData("x-song");
    setEl.classList.remove("drop-zone");
    if (!id) return;
    e.preventDefault();
    const isNew = !S.set.includes(id);
    placeSong(id, insertIndex(e.clientY));
    toast(isNew ? `${XL.songs[id].title} entrou no culto` : "Ordem atualizada");
  });
  let sdrag = null;
  setEl.addEventListener("pointerdown", (e) => {
    const g = e.target.closest(".grip");
    if (!g) return;
    e.preventDefault();
    const row = g.closest(".set-i");
    sdrag = { k: +row.dataset.k, row };
    row.classList.add("lifting");
    setEl.setPointerCapture(e.pointerId);
  });
  setEl.addEventListener("pointermove", (e) => { if (sdrag) { sdrag.to = insertIndex(e.clientY); markInsert(sdrag.to); } });
  const endS = () => {
    if (!sdrag) return;
    const { k, to } = sdrag; sdrag = null;
    if (to == null || to === k || to === k + 1) return renderSet();
    placeSong(S.set[k], to);
  };
  setEl.addEventListener("pointerup", endS);
  setEl.addEventListener("pointercancel", endS);

  /* ───────── cliques e arrastes gerais ───────── */
  document.addEventListener("dragstart", (e) => {
    const t = e.target.closest?.("[data-song],[data-bg],[data-img]");
    if (!t) return;
    if (t.dataset.song) e.dataTransfer.setData("x-song", t.dataset.song);
    if (t.dataset.bg) e.dataTransfer.setData("x-bg", t.dataset.bg);
    if (t.dataset.img != null) e.dataTransfer.setData("x-img", t.dataset.img);
    e.dataTransfer.effectAllowed = "copyMove";
  });
  document.addEventListener("click", async (e) => {
    const t = e.target.closest("button, [data-el-sel], [data-go-s]");
    if (!t) return;
    const d = t.dataset;
    if (d.m) return setMode(d.m);
    if (d.t) { S.tab = d.t; $$("#tabs button").forEach((b) => b.classList.toggle("on", b === t)); $$(".st-pane").forEach((p) => p.classList.toggle("on", p.dataset.pane === d.t)); return; }
    if (d.l) { S.lib = d.l; return renderLib(); }
    if (d.open) return openSong(d.open);
    if (d.add) { S.set = [...S.set, d.add]; renderSet(); renderSongList(); renderNext(); return toast(`${XL.songs[d.add].title} entrou no culto`); }
    if (d.rm != null) { const id = S.set[+d.rm]; S.set = S.set.filter((_, k) => k !== +d.rm); renderSet(); renderNext(); if (S.lib === "songs") renderSongList(); return toast(`${XL.songs[id].title} saiu do culto`); }
    if (d.bg) { applyLook({ bg: d.bg, image: null }); return; }
    if (d.imgAdd != null) return addImage(IMGS[+d.imgAdd]);
    if (d.imgBg != null) { applyLook({ image: IMGS[+d.imgBg] }); return toast("Imagem como fundo"); }
    if (d.imgRm != null) { IMGS = IMGS.filter((_, k) => k !== +d.imgRm); save("xlide.v2.images", IMGS); return renderLib(); }
    if (t.id === "up") return $("#file").click();
    if (d.goS) return d.goS !== S.song ? openSong(d.goS, +d.goJ) : go(+d.goJ);
    if (d.sc) { S.scope = d.sc; return renderStyle(); }
    if (d.font) return applyLook({ font: d.font });
    if (d.align) return applyLook({ align: d.align });
    if (d.ink) return applyLook(d.ink === "auto" ? { inkSet: false } : { ink: d.ink, inkSet: true });
    if (d.anchor) {
      const [c, r] = d.anchor.split(",").map(Number), w = XLOOK.resolve(S.song, S.i).w;
      const x = c === 0 ? w / 2 + 6 : c === 2 ? 100 - w / 2 - 6 : 50;
      return applyLook({ x: +x.toFixed(1), y: [24, 50, 76][r], align: ["left", "center", "right"][c] });
    }
    if (d.elDel) { e.stopPropagation(); return delEl(d.elDel); }
    if (d.elSel) { S.sel = d.elSel; renderCanvas(); return renderText(); }
    switch (d.act) {
      case "add-text": return addText();
      case "add-img": return $("#file").click();
      case "bgs": S.lib = "bgs"; renderLib(); if (innerWidth < 1100) $('#tabs [data-t="lib"]').click(); return;
      case "suggest": { const sg = suggest(S.song); applyLook({ bg: sg.bg, font: sg.font, image: null }); return toast("Visual sugerido aplicado"); }
      case "trans": return applyLook({ trans: !XLOOK.resolve(S.song, S.i).trans });
      case "center": return applyLook({ x: 50, y: 50, align: "center" });
      case "clear-slide": clearSlide(); return toast(`O slide ${S.i + 1} voltou a seguir a música`);
      case "reset": XLOOK.reset(S.song); return toast("Visual original restaurado");
      case "orig": XLOOK.set(S.song, { text: undefined }, S.i); return;
      case "el-center": return updEl(S.sel, { x: 50, y: 50 });
      case "el-bg": { const el = els().find((x) => x.id === S.sel); if (el) { const src = el.src; delEl(el.id); applyLook({ image: src }); } return; }
    }
  });
  $("#file").onchange = async (e) => {
    const srcs = await storeFiles(e.target.files);
    srcs.forEach((src, k) => addImage(src, 50 + k * 4, 50 + k * 4));
    e.target.value = "";
  };
  // soltar arquivo na área de imagens da biblioteca
  $("#libbody").addEventListener("dragover", (e) => { if (S.lib === "imgs" && e.dataTransfer.types.includes("Files")) { e.preventDefault(); $("#up")?.classList.add("drop"); } });
  $("#libbody").addEventListener("drop", async (e) => { if (S.lib !== "imgs") return; e.preventDefault(); $("#up")?.classList.remove("drop"); await storeFiles(e.dataTransfer.files); toast("Imagem na biblioteca"); });

  $("#play").onclick = () => { if (!S.playing && S.t >= XL.songs[S.song].dur - 0.5) S.t = 0; S.playing = !S.playing; renderTransport(); };
  $("#prev").onclick = () => step(-1);
  $("#nextb").onclick = () => step(1);
  $("#follow").onclick = (e) => { e.preventDefault(); S.follow = !S.follow; renderTransport(); };

  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea, select") || e.target.isContentEditable) return;
    const k = e.key;
    if ((k === " " || k === "Enter") && e.target.closest?.("button, [role=button]")) return;
    if (k === " ") { e.preventDefault(); return $("#play").click(); }
    if (k === "p" || k === "P") return setMode(S.mode === "edit" ? "preview" : "edit");
    if (k === "Escape") { if (S.mode === "preview") return setMode("edit"); return select(null); }
    if (S.sel && S.mode === "edit" && /^Arrow/.test(k)) {
      e.preventDefault();
      const n = e.shiftKey ? 5 : 1, c = posOf(S.sel);
      const p = { x: clamp(c.x + (k === "ArrowRight" ? n : k === "ArrowLeft" ? -n : 0), 0, 100), y: clamp(c.y + (k === "ArrowDown" ? n : k === "ArrowUp" ? -n : 0), 0, 100) };
      return S.sel === "tb" ? applyLook(p) : updEl(S.sel, p);
    }
    if ((k === "Delete" || k === "Backspace") && S.sel && S.sel !== "tb") { e.preventDefault(); return delEl(S.sel); }
    if (k === "ArrowRight") return step(1);
    if (k === "ArrowLeft") return step(-1);
  });

  $("#back").innerHTML = I.back;
  $("#prev").innerHTML = I.prev;
  $("#nextb").innerHTML = I.next;
  renderAll();
  requestAnimationFrame(tick);
})();
