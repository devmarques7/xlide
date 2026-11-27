/* XLIDE v2 · mídia importada por link: YouTube, Vimeo, Spotify, arquivo de vídeo ou áudio.
   parse(url) → { kind: "video"|"audio", src: "youtube"|"vimeo"|"spotify"|"file", id, url, thumb, name }
   html(m) → o elemento que o slide desenha (vazio até ser ligado; a capa fica embaixo).
   Onde toca depende do container mais próximo com [data-media-on]:
     "live"  → toca com som (projetor, apresentação)   "muted" → toca sem som (console)
     "edit"  → vídeo sem som; áudio com o player visível para tocar enquanto edita
   Sem [data-media-on] (miniaturas, gavetas) fica só a capa. Ligado por XLOOK.hydrate.
   html(m, { mute: true }) → o vídeo toca SEM o áudio original em todo lugar (item do programa com
   "Áudio do vídeo" desligado); o som da tela vem da trilha de fundo escolhida para ela. */
(function () {
  function parse(raw) {
    const url = String(raw || "").trim(); let u; try { u = new URL(url); } catch { return null; }
    const h = u.hostname.replace(/^www\.|^m\./, "");
    if (/youtube\.com|youtu\.be/.test(h)) {
      const id = u.searchParams.get("v") || (h === "youtu.be" ? u.pathname.slice(1) : (u.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/) || [])[2]);
      return id ? { kind: "video", src: "youtube", id, url, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, name: "YouTube" } : null;
    }
    if (/vimeo\.com/.test(h)) { const id = (u.pathname.match(/(\d{5,})/) || [])[1]; return id ? { kind: "video", src: "vimeo", id, url, thumb: null, name: "Vimeo" } : null; }
    if (/spotify\.com/.test(h)) { const m = u.pathname.match(/\/(track|album|playlist|episode|show)\/(\w+)/); return m ? { kind: "audio", src: "spotify", type: m[1], id: m[2], url, thumb: null, name: "Spotify" } : null; }
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u.pathname)) return { kind: "video", src: "file", url, thumb: null, name: "Vídeo" };
    if (/\.(mp3|m4a|wav|ogg|aac)(\?|$)/i.test(u.pathname)) return { kind: "audio", src: "file", url, thumb: null, name: "Áudio" };
    return null;
  }
  function embedSrc(m, mode, mute) {
    const sound = (mode === "live" || mode === "ctl") && !mute, auto = mode !== "edit" || m.kind === "video", ctl = mode === "edit" || mode === "ctl";
    if (m.src === "youtube") return `https://www.youtube.com/embed/${m.id}?autoplay=${auto ? 1 : 0}&mute=${sound ? 0 : 1}&controls=${ctl ? 1 : 0}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3`;
    if (m.src === "vimeo") return `https://player.vimeo.com/video/${m.id}?autoplay=${auto ? 1 : 0}&muted=${sound ? 0 : 1}&controls=${ctl ? 1 : 0}&title=0&byline=0&portrait=0`;
    if (m.src === "spotify") return `https://open.spotify.com/embed/${m.type}/${m.id}?utm_source=generator&theme=0`;
    return m.url;
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  /* O elemento do slide. Vídeo: ocupa o slide inteiro. Áudio: player pequeno no canto. */
  function html(raw, opts = {}) {
    const m = typeof raw === "string" ? parse(raw) : raw; if (!m) return "";
    const mute = opts.mute && m.kind === "video";
    const cover = m.thumb ? `<img src="${m.thumb}" alt="">` : `<span class="emb-ph">${m.kind === "audio" ? "♪" : "▶"} ${esc(m.name)}</span>`;
    return `<div class="emb emb-${m.kind}" data-emb="${esc(m.url)}"${mute ? ' data-mute="1"' : ""} aria-hidden="${m.kind === "video"}">${cover}${mute ? '<span class="emb-mute" title="Sem o áudio original do vídeo">Sem áudio</span>' : ""}</div>`;
  }
  function hydrate(root) {
    (root.matches?.("[data-emb]") ? [root] : [...root.querySelectorAll("[data-emb]")]).forEach((el) => {
      const on = el.closest("[data-media-on]"); const mode = on ? on.dataset.mediaOn || "live" : null; const mute = el.dataset.mute === "1";
      const have = el.querySelector("iframe, video, audio");
      if (!mode) { have && have.remove(); return; }
      if (have && have.dataset.mode === mode) return;
      have && have.remove();
      const m = parse(el.dataset.emb); if (!m) return;
      let n;
      if (m.src === "file") { n = document.createElement(m.kind === "video" ? "video" : "audio"); n.src = m.url; n.autoplay = mode !== "edit" || m.kind === "video"; n.muted = mute || (mode !== "live" && mode !== "ctl"); n.controls = mode === "edit" || mode === "ctl" || m.kind === "audio"; n.playsInline = true; }
      else { n = document.createElement("iframe"); n.src = embedSrc(m, mode, mute); n.allow = "autoplay; encrypted-media; fullscreen; clipboard-write"; n.title = m.name; }
      n.dataset.mode = mode;
      el.append(n);
    });
  }
  const label = (raw) => { const m = typeof raw === "string" ? parse(raw) : raw; return m ? `${m.kind === "audio" ? "Áudio" : "Vídeo"} · ${m.name}` : "Link não reconhecido"; };
  window.MEDIA = { parse, html, hydrate, label, embedSrc };
})();
