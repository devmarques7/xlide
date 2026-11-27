/* XLIDE v2 · trilha de fundo: música baixinha por trás das telas.
   Uma trilha para o culto inteiro e, em cada tela, "Do culto", outra fonte, ou "Sem trilha" (off).
   Telas que já têm som (música ao vivo, vídeo, sermão) começam sem trilha.
   Fontes: playlists/mixes do YouTube (o player é o da IFrame API, mudo de vídeo, só o áudio importa).
   O som sai no computador do console (é ele que vai para a mesa); a tela do projetor não toca.
   No app real: program.bgm + item.bgm no doc do programa; o player roda no Remote. */
(function () {
  const KEY = "xlide.v2.trilha";
  const SOURCES = [
    { id: "mix1", name: "Mix 1", video: "H9U9E3c0Qzg", list: "RDH9U9E3c0Qzg", url: "https://www.youtube.com/watch?v=H9U9E3c0Qzg&list=RDH9U9E3c0Qzg" },
    { id: "mix2", name: "Mix 2", video: "gzBfPImKVa8", list: "RDgzBfPImKVa8", url: "https://youtube.com/playlist?list=RDgzBfPImKVa8" },
  ];
  const LOW = 20; // "baixo": volume padrão por trás de voz e telas
  const OFF_BY_DEFAULT = ["song", "video", "sermon"];

  const fresh = () => ({ service: { src: "mix1", vol: LOW }, items: {}, extra: [], titles: {}, lists: {} });
  let conf = (() => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return fresh(); } })();
  const subs = new Set();
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("xlide-v2-trilha") : null;
  bc && (bc.onmessage = (e) => { conf = e.data; subs.forEach((f) => f()); });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(conf)); } catch {} bc && bc.postMessage(conf); subs.forEach((f) => f()); }

  const sources = () => [...SOURCES, ...(conf.extra || [])];
  const src = (id) => sources().find((s) => s.id === id) || SOURCES[0];
  const keyOf = (it) => it.title;
  /* Modo de uma tela: "inherit" (trilha do culto) | "off" | id de uma fonte. */
  /* Sem trilha do culto inteiro: cada tela começa sem trilha e recebe a sua na gaveta do item. */
  /* A trilha da tela vai no próprio item (it.bgm, gravado no programa e pelo MCP); o que está
     neste computador (conf.items) só vale para itens que ainda não têm it.bgm. */
  const ownOf = (it) => ({ ...(conf.items[keyOf(it)] || {}), ...(it.bgm || {}) });
  const modeOf = (it) => ownOf(it).mode ?? "off";
  function resolve(it) {
    if (!it) return { on: false, why: "Sem tela" };
    const m = modeOf(it), own = ownOf(it);
    if (m === "off") return { on: false, mode: m, why: "Sem trilha" };
    if (m.startsWith("track:")) { const id = m.slice(6); conf.titles[id] || meta(id); return { on: true, mode: "track", track: id, src: srcOfTrack(id), vol: own.vol ?? conf.service.vol, why: `Faixa · ${title(id)}` }; }
    const s = m === "inherit" ? src(conf.service.src) : src(m);
    return { on: true, mode: m, src: s, vol: own.vol ?? conf.service.vol, why: m === "inherit" ? `Trilha do culto · ${s.name}` : `Própria · ${s.name}` };
  }
  function setItem(it, patch) { conf.items[keyOf(it)] = { ...(conf.items[keyOf(it)] || {}), ...patch }; it.bgm = { ...(it.bgm || {}), ...patch }; save(); }
  function setService(patch) { conf.service = { ...conf.service, ...patch }; save(); }
  /* Colar um link do YouTube (vídeo, playlist ou mix) vira uma fonte. */
  function addSource(url, name) {
    const u = (() => { try { return new URL(url); } catch { return null; } })();
    if (!u || !/youtu/.test(u.hostname)) return null;
    const list = u.searchParams.get("list"), video = u.searchParams.get("v") || (u.hostname === "youtu.be" ? u.pathname.slice(1) : null) || (list && list.startsWith("RD") ? list.slice(2) : null);
    if (!video && !list) return null;
    const s = { id: "x" + Date.now().toString(36), name: name || `Fonte ${sources().length + 1}`, video, list, url };
    conf.extra = [...(conf.extra || []), s]; save(); return s;
  }
  const short = (t) => (t.length > 22 ? t.slice(0, 21) + "…" : t);
  const chip = (it) => { const r = resolve(it); return r.on ? `<span class="tr-chip on" title="${esc(r.why)}, volume ${r.vol}%">♪ ${r.mode === "inherit" ? "culto" : r.mode === "track" ? esc(short(title(r.track))) : r.src.name} · ${r.vol}%</span>` : `<span class="tr-chip" title="Sem trilha nesta tela">♪ off</span>`; };

  /* ── faixas: ids de cada fonte (lidos da playlist) e títulos (oEmbed do YouTube), em cache ── */
  const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  const title = (id) => conf.titles[id]?.t || "Faixa " + id;
  const author = (id) => conf.titles[id]?.a || "";
  const srcOfTrack = (id) => sources().find((x) => (conf.lists[x.id] || []).includes(id) || x.video === id) || src(conf.service.src);
  const pending = new Set();
  let saveT = null;
  const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 250); };
  function meta(id) {
    if (conf.titles[id] || pending.has(id)) return;
    pending.add(id);
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}&format=json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { conf.titles[id] = { t: j.title, a: j.author_name }; saveSoon(); })
      .catch(() => { conf.titles[id] = { t: "Faixa indisponível", a: "não toca fora do YouTube", bad: true }; saveSoon(); });
  }
  /* Lista as faixas de uma fonte com um player escondido (só lê a playlist). */
  const listing = {};
  function list(id) {
    const s = src(id);
    if (conf.lists[s.id]?.length) { conf.lists[s.id].forEach(meta); return Promise.resolve(conf.lists[s.id]); }
    if (!s.list) { conf.lists[s.id] = [s.video]; meta(s.video); save(); return Promise.resolve(conf.lists[s.id]); }
    if (listing[s.id]) return listing[s.id];
    listing[s.id] = api().then(() => new Promise((res) => {
      const box = document.createElement("div"); box.style.cssText = "position:fixed;left:-9999px;top:0;width:200px;height:120px"; const h = document.createElement("div"); box.append(h); document.body.append(box);
      let tries = 0;
      const pl = new YT.Player(h, { width: 200, height: 120, videoId: s.video, playerVars: { list: s.list, listType: "playlist", controls: 0 }, events: { onReady: () => {
        const t = setInterval(() => {
          const ids = pl.getPlaylist && pl.getPlaylist();
          if ((ids && ids.length) || ++tries > 30) { clearInterval(t); const L = ids && ids.length ? ids : [s.video]; conf.lists[s.id] = L; save(); L.forEach(meta); try { pl.destroy(); } catch {} box.remove(); res(L); }
        }, 200);
      } } });
    }));
    return listing[s.id];
  }

  /* Campo para a gaveta do item (Programa). */
  function field(it) {
    const m = modeOf(it), own = ownOf(it);
    return `<div class="field tr-field" data-tr-field><span class="lbl">Trilha de fundo nesta tela</span>
      <div class="seg tr-modes">${[...sources().map((s) => [s.id, s.name]), ...(m.startsWith("track:") ? [[m, "♪ " + short(title(m.slice(6)))]] : []), ["off", "Sem trilha"]].map(([k, n]) => `<button type="button" data-tr-mode="${k}" class="${m === k ? "on" : ""}">${n}</button>`).join("")}</div>
      <label class="ctl tr-vol" ${m === "off" ? "hidden" : ""}><span>Volume</span><input type="range" min="0" max="100" step="5" data-tr-vol value="${own.vol ?? conf.service.vol}"><output>${own.vol ?? conf.service.vol}%</output></label>
      <span class="muted" style="font-size:var(--t-sm)">${OFF_BY_DEFAULT.includes(it.type) ? "Esta tela já tem som (música, vídeo ou fala): começa sem trilha." : "Fica baixinha por trás da tela. 20% é o padrão."}</span></div>`;
  }
  function bindField(root, it, after) {
    root.querySelectorAll("[data-tr-mode]").forEach((b) => (b.onclick = () => {
      setItem(it, { mode: b.dataset.trMode });
      root.querySelectorAll("[data-tr-mode]").forEach((x) => x.classList.toggle("on", x === b));
      root.querySelector(".tr-vol").hidden = b.dataset.trMode === "off";
      after && after();
    }));
    const r = root.querySelector("[data-tr-vol]");
    r && (r.oninput = () => { setItem(it, { vol: +r.value }); r.nextElementSibling.textContent = r.value + "%"; after && after(); });
  }

  /* ── player (IFrame API do YouTube) ── */
  let apiP = null;
  function api() {
    if (window.YT && YT.Player) return Promise.resolve();
    if (apiP) return apiP;
    apiP = new Promise((res) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
      const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.append(s);
    });
    return apiP;
  }
  /* Cria o player num elemento. Devolve controles com volume suave (fade). */
  /* preload: true → ao carregar (e a cada faixa selecionada) o player toca mudo um instante e pausa no
     começo, para o vídeo já estar baixado; Tocar então começa na hora, sem esperar o YouTube. */
  function player(el, { onChange, preload = false } = {}) {
    const st = { ready: false, playing: false, vol: conf.service.vol, target: conf.service.vol, src: null, title: "", muted: false, videoId: null, queue: [], warming: false, preloaded: false };
    let p = null, fadeT = null, warmT = null;
    const waiting = [];
    // termina o pré-carregamento: volta ao começo, pausado, com o volume certo, e roda o que esperava
    function warmDone(ok) {
      clearTimeout(warmT);
      if (!st.warming) return;
      st.warming = false; st.preloaded = !!ok;
      try { p.pauseVideo(); p.seekTo(0, true); p.unMute(); p.setVolume(st.muted ? 0 : st.vol); } catch {}
      st.playing = false; emit();
      waiting.splice(0).forEach((f) => f());
    }
    function warm() {
      if (!preload || !p || !st.ready) return;
      st.warming = true; st.preloaded = false; emit();
      try { p.mute(); p.playVideo(); } catch { return warmDone(false); }
      clearTimeout(warmT); warmT = setTimeout(() => warmDone(false), 8000); // navegador bloqueou ou rede lenta: segue sem pré-carga
    }
    const emit = () => onChange && onChange(st);
    const host = document.createElement("div"); el.append(host);
    function load(s, autoplay) {
      st.src = s.id; st.title = "";
      if (!p) return;
      const opts = s.list ? { list: s.list, listType: "playlist", index: 0 } : null;
      if (autoplay) opts ? p.loadPlaylist(opts) : p.loadVideoById(s.video);
      else opts ? p.cuePlaylist(opts) : p.cueVideoById(s.video);
      emit();
    }
    api().then(() => {
      const s = src(conf.service.src);
      p = new YT.Player(host, {
        width: "100%", height: "100%", videoId: s.video,
        playerVars: { list: s.list || undefined, listType: s.list ? "playlist" : undefined, controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
        events: {
          onReady: () => { st.ready = true; st.src = s.id; p.setVolume(st.vol); emit(); preload ? warm() : waiting.splice(0).forEach((f) => f()); },
          onStateChange: (e) => {
            if (st.warming) {
              const d = p.getVideoData && p.getVideoData(); if (d && d.title) st.title = d.title; if (d && d.video_id) st.videoId = d.video_id;
              if (e.data === YT.PlayerState.PLAYING) warmDone(true);
              return;
            }
            st.playing = e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING;
            const d = p.getVideoData && p.getVideoData(); if (d && d.title) st.title = d.title; if (d && d.video_id) st.videoId = d.video_id;
            // fim da faixa: primeiro a fila; sem fila, volta para a playlist da fonte
            if (e.data === YT.PlayerState.ENDED) { if (st.queue.length) c.playTrack(st.queue.shift()); else if (st.single) { st.single = false; load(src(st.src || conf.service.src), true); } }
            emit();
          },
          onError: () => { if (st.warming) warmDone(false); st.title = "Esta faixa não toca fora do YouTube. Pulando…"; emit(); setTimeout(() => p && p.nextVideo(), 800); },
        },
      });
    });
    function fadeTo(v, then) {
      clearInterval(fadeT); st.target = v;
      if (!p || !st.ready) { st.vol = v; then && then(); return emit(); }
      fadeT = setInterval(() => {
        const d = st.target - st.vol;
        st.vol = Math.abs(d) <= 2 ? st.target : st.vol + Math.sign(d) * 2;
        p.setVolume(st.muted ? 0 : st.vol);
        if (st.vol === st.target) { clearInterval(fadeT); then && then(); }
        emit();
      }, 60);
    }
    const c = {
      st,
      play() { if (!p || !st.ready || st.warming) return c.whenReady(() => c.play()); p.playVideo(); },
      /* roda fn assim que o player estiver pronto (e pré-carregado); na hora, se já estiver */
      whenReady(fn) { if (p && st.ready && !st.warming) return fn(); if (!waiting.includes(fn)) waiting.push(fn); },
      get loading() { return !st.ready || st.warming; },
      pause() { p && p.pauseVideo(); },
      toggle() { st.playing ? c.pause() : c.play(); },
      next() { p && (p.nextVideo ? p.nextVideo() : null); },
      prev() { p && p.previousVideo && p.previousVideo(); },
      mute(v = !st.muted) { st.muted = v; p && p.setVolume(v ? 0 : st.vol); emit(); },
      setVol(v) { clearInterval(fadeT); st.vol = st.target = v; p && p.setVolume(st.muted ? 0 : v); emit(); },
      fadeTo,
      /* Entrar numa tela: liga, troca de fonte ou desliga com fade. */
      apply(r) {
        if (!st.ready || st.warming) return c.whenReady(() => c.apply(r));
        if (!r.on) { if (st.playing) fadeTo(0, () => p.pauseVideo()); return; }
        if (r.track) {
          if (st.videoId === r.track) { if (!st.playing) { st.vol = 0; p.setVolume(0); p.playVideo(); } return fadeTo(r.vol); }
          const go = () => { st.vol = 0; p.setVolume(0); c.playTrack(r.track); setTimeout(() => fadeTo(r.vol), 400); };
          return st.playing ? fadeTo(0, go) : go();
        }
        if (st.src !== r.src.id) { fadeTo(0, () => { load(r.src, true); st.vol = 0; p.setVolume(0); setTimeout(() => fadeTo(r.vol), 400); }); return; }
        if (!st.playing) { st.vol = 0; p.setVolume(0); p.playVideo(); }
        fadeTo(r.vol);
      },
      load,
      /* Tocar uma faixa: dentro da playlist carregada, pula até ela; senão carrega só ela. */
      playTrack(id) {
        if (!p || !st.ready || st.warming) return c.whenReady(() => c.playTrack(id));
        const L = (p.getPlaylist && p.getPlaylist()) || [], i = L.indexOf(id);
        if (i >= 0) { st.single = false; p.playVideoAt(i); } else { st.single = true; p.loadVideoById(id); }
        st.videoId = id; st.title = title(id); st.queue = st.queue.filter((x) => x !== id); emit();
      },
      /* Selecionar sem tocar: a faixa fica carregada no controle até apertar Tocar. */
      cueTrack(id) {
        if (!p || !st.ready) return;
        const L = (p.getPlaylist && p.getPlaylist()) || [], i = L.indexOf(id);
        if (i >= 0 && st.src) { st.single = false; p.cuePlaylist({ list: src(st.src).list, listType: "playlist", index: i }); } else { st.single = true; p.cueVideoById(id); }
        st.videoId = id; st.title = title(id); st.playing = false; emit();
        setTimeout(warm, 300); // a faixa escolhida também fica pré-carregada
      },
      enqueue(id) { if (!st.queue.includes(id)) st.queue.push(id); emit(); },
      dequeue(id) { st.queue = st.queue.filter((x) => x !== id); emit(); },
    };
    c.host = host;
    return c;
  }

  /* ── seletor de trilha de uma tela (gaveta do item): faixa escolhida no topo, todas as faixas embaixo ── */
  const pst = {};
  function picker(it) {
    if (it.type === "song") return `<div class="trp" data-trp><span class="lbl">Trilha de fundo nesta tela</span><div class="trp-on none"><span class="ok">♪ Bloqueada: esta tela é uma música</span><span style="grid-column:1/-1;font-size:var(--t-xs);color:var(--fg-2)">A música tem a própria faixa (a playlist dela), então a trilha de fundo não toca por cima. No Ao vivo, a música aparece com controles de tocar, pausar e linha do tempo.</span></div></div>`;
    const k = keyOf(it), ps = (pst[k] = pst[k] || { tab: conf.service.src, q: "" });
    const r = resolve(it), id = r.track;
    const ids = conf.lists[ps.tab];
    const L = (ids || []).filter((x) => !ps.q || (title(x) + " " + author(x)).toLowerCase().includes(ps.q));
    const top = r.on
      ? `<div class="trp-on"><span class="ok">✓ Trilha adicionada para esta tela</span>${id ? `<img src="${thumb(id)}" alt="">` : `<span class="trp-mix">♪</span>`}<span style="min-width:0"><b>${esc(id ? title(id) : `${r.src.name} inteira, em sequência`)}</b><small>${esc(id ? author(id) : "YouTube")} · ${r.vol}%</small></span>
         <span class="acts">${id ? `<button type="button" data-trp-play="${id}">Ouvir</button>` : ""}<button type="button" data-trp-mode="off">Tirar · sem trilha</button></span></div>
         <label class="tr-vol"><span>Volume</span><input type="range" min="0" max="100" step="5" data-trp-vol value="${r.vol}"><output>${r.vol}%</output></label>`
      : `<div class="trp-on none"><span class="ok">Esta tela está sem trilha</span><span style="grid-column:1/-1;font-size:var(--t-xs);color:var(--fg-2)">${it.type === "media" && it.mute ? "O vídeo está sem o áudio original: escolha abaixo a trilha que toca por cima dele." : OFF_BY_DEFAULT.includes(it.type) ? "Ela já tem som (música, vídeo ou fala). Só adicione se fizer sentido." : "Escolha uma faixa abaixo para tocar baixinho enquanto esta tela estiver no ar."}</span></div>`;
    const rows = ids ? `<div class="trp-row mix"><span class="trp-mix">♪</span><span style="min-width:0"><b>${src(ps.tab).name} inteira</b><small>${ids.length} faixas em sequência</small></span><span class="ac"><button type="button" class="add" data-trp-mode="${ps.tab}">${r.mode === ps.tab ? "✓" : "+ Adicionar"}</button></span></div>` +
      L.map((x) => `<div class="trp-row${id === x ? " on" : ""}${conf.titles[x]?.bad ? " bad" : ""}"><img src="${thumb(x)}" alt="" loading="lazy"><span style="min-width:0"><b>${esc(title(x))}</b><small>${id === x ? "nesta tela" : esc(author(x))}</small></span><span class="ac"><button type="button" data-trp-play="${x}" aria-label="Ouvir antes">▶</button><button type="button" class="add" data-trp-add="${x}">${id === x ? "✓" : "+ Adicionar"}</button></span></div>`).join("")
      : `<p class="trp-hint">Lendo as faixas da ${src(ps.tab).name}…</p>`;
    return `<div class="trp" data-trp><span class="lbl">Trilha de fundo nesta tela</span>${top}
      <div class="seg">${sources().map((x) => `<button type="button" data-trp-tab="${x.id}" class="${x.id === ps.tab ? "on" : ""}">${x.name}</button>`).join("")}</div>
      <input class="input" data-trp-q placeholder="Buscar faixa" value="${esc(ps.q)}" aria-label="Buscar faixa">
      <div class="trp-list">${rows}</div>
      <details class="tr-add"><summary class="lbl">Adicionar fonte (link do YouTube)</summary><div class="row" style="margin-top:var(--s2)"><input class="input" data-trp-url placeholder="Link de vídeo, playlist ou mix"><button type="button" class="btn" data-trp-src>Adicionar</button></div></details></div>`;
  }
  function bindPicker(root, it, after) {
    const box = () => root.querySelector("[data-trp]");
    const k = keyOf(it), ps = (pst[k] = pst[k] || { tab: conf.service.src, q: "" });
    const repaint = () => { const b = box(); if (!b) return; const sc = b.querySelector(".trp-list")?.scrollTop || 0; b.outerHTML = picker(it); const n = box(); n.querySelector(".trp-list").scrollTop = sc; wire(); };
    function wire() {
      const b = box(); if (!b || !b.querySelector("[data-trp-q]")) return;
      if (!conf.lists[ps.tab]) list(ps.tab).then(repaint);
      b.onclick = (e) => {
        const t = e.target.closest("button"); if (!t) return;
        const d = t.dataset;
        if (d.trpTab) { ps.tab = d.trpTab; return repaint(); }
        if (d.trpAdd) { setItem(it, { mode: "track:" + d.trpAdd }); repaint(); after && after(`Trilha adicionada para esta tela: ${short(title(d.trpAdd))}`); return; }
        if (d.trpMode) { setItem(it, { mode: d.trpMode }); repaint(); after && after(d.trpMode === "off" ? "Esta tela ficou sem trilha." : `${src(d.trpMode).name} inteira nesta tela.`); return; }
        if (d.trpPlay) return previewPlay(d.trpPlay, resolve(it).vol || conf.service.vol);
        if (d.trpSrc != null) { const s2 = addSource(b.querySelector("[data-trp-url]").value.trim()); if (s2) { ps.tab = s2.id; repaint(); after && after(`${s2.name} adicionada como fonte.`); } else after && after("Não é um link do YouTube."); }
      };
      b.querySelector("[data-trp-q]").oninput = (e) => { ps.q = e.target.value.toLowerCase(); const pos = e.target.selectionStart; repaint(); const q = box().querySelector("[data-trp-q]"); q.focus(); q.setSelectionRange(pos, pos); };
      const v = b.querySelector("[data-trp-vol]"); v && (v.oninput = () => { setItem(it, { vol: +v.value }); v.nextElementSibling.textContent = v.value + "%"; prev && prev.st.playing && prev.setVol(+v.value); });
      v && (v.onchange = () => after && after());
    }
    wire();
    // títulos chegando do YouTube (ou outra mudança): redesenha, menos enquanto a pessoa digita ou arrasta o volume
    const fn = () => { if (!document.contains(root)) return subs.delete(fn); if (document.activeElement?.matches?.("[data-trp-q],[data-trp-vol]")) return; repaint(); };
    subs.add(fn);
  }
  /* Ouvir antes: player pequeno no canto da tela, o mesmo para todas as páginas. */
  let prev = null;
  function previewPlay(id, vol = LOW) {
    let m = document.getElementById("trp-mini");
    if (!m) {
      m = document.createElement("div"); m.id = "trp-mini"; m.className = "trp-mini";
      m.innerHTML = `<div class="yt"></div><span style="min-width:0"><small>Ouvindo antes</small><b></b></span><button type="button">Parar</button>`;
      document.body.append(m);
      prev = player(m.querySelector(".yt"), { onChange: (st) => { m.querySelector("b").textContent = st.title || "Carregando…"; } });
      m.querySelector("button").onclick = () => { prev.pause(); m.classList.remove("on"); };
    }
    m.classList.add("on");
    const go = () => { prev.setVol(vol); prev.playTrack(id); };
    prev.st.ready ? go() : (function w() { prev.st.ready ? go() : setTimeout(w, 200); })();
  }

  /* Importar um vídeo do YouTube como faixa: entra na fonte "Importadas" (no topo da lista) e devolve o id.
     Link de playlist/mix vira uma fonte inteira. */
  function importTrack(url) {
    let u; try { u = new URL(url.trim()); } catch { return null; }
    if (!/youtu/.test(u.hostname)) return null;
    const v = u.searchParams.get("v") || (u.hostname === "youtu.be" ? u.pathname.slice(1) : (u.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/) || [])[2]);
    if (!v) { const s2 = addSource(url); return s2 ? { source: s2 } : null; }
    let imp = (conf.extra || []).find((x) => x.id === "imp");
    if (!imp) { imp = { id: "imp", name: "Importadas", video: v, list: null, url }; conf.extra = [imp, ...(conf.extra || [])]; }
    conf.lists.imp = [v, ...(conf.lists.imp || []).filter((x) => x !== v)];
    save(); meta(v);
    return { id: v };
  }

  window.TRILHA = { importTrack, picker, bindPicker, previewPlay, SOURCES, LOW, sources, src, modeOf, resolve, list, meta, title, author, thumb, short, esc, srcOfTrack, setItem, setService, addSource, chip, field, bindField, player, get conf() { return conf; }, on: (f) => (subs.add(f), () => subs.delete(f)) };
})();
