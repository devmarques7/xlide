/* XLIDE v2 · navegador de fontes: o catálogo inteiro (Google Fonts, Fontshare, Fontsource: ~2100 famílias)
   com busca e categorias, as fontes da equipe e "Importar fonte" (arquivo .woff2/.ttf/.otf ou link).
   XFONTPICK.open(atual, (familia) => …). Carregado por XLOOK.pickFont na primeira vez. */
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const CATS = [["", "Todas"], ["sans", "Sans"], ["serif", "Serif"], ["display", "Display"], ["script", "Script"], ["mono", "Mono"]];
  const SRC = { google: "Google Fonts", fontshare: "Fontshare", fontsource: "Fontsource", custom: "Importada" };
  const st = { q: "", cat: "", list: [], total: 0, of: 0, busy: false };
  const preview = new Set();
  /* prévia leve: Google manda só as letras do nome (&text=); as outras fontes carregam inteiras */
  function show(f) {
    if (preview.has(f.family)) return; preview.add(f.family);
    if (f.source === "google") {
      const l = document.createElement("link"); l.rel = "stylesheet";
      l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family).replace(/%20/g, "+")}&text=${encodeURIComponent(f.family + "Aa123")}&display=swap`;
      document.head.append(l);
    } else XLOOK.loadFont(f.family);
  }
  const lib = () => { try { return JSON.parse(localStorage.getItem("xlide.v2.fonts")) || {}; } catch { return {}; } };
  const saveLib = (v) => localStorage.setItem("xlide.v2.fonts", JSON.stringify(v));

  async function search() {
    st.busy = true; paint();
    try {
      const r = await fetch(`/api/fonts?${new URLSearchParams({ q: st.q, category: st.cat, limit: 120 })}`).then((x) => x.json());
      st.list = r.fonts || []; st.total = r.total || 0; st.of = r.of || 0;
    } catch { st.list = []; st.total = 0; }
    st.busy = false; paint();
  }
  let box = null, cur = "", done = null, tq;
  function row(f) {
    show(f);
    return `<button type="button" class="fp-row${f.family === cur ? " on" : ""}" data-fam="${esc(f.family)}"><span class="fp-aa" style="font-family:'${esc(f.family)}', var(--font)">${esc(f.family)}</span><span class="fp-meta">${esc(f.category)} · ${SRC[f.source] || f.source}</span></button>`;
  }
  function paint() {
    if (!box) return;
    const mine = [...new Set([...(lib().custom || []).map((f) => f.family), ...(lib().used || [])])];
    box.querySelector("[data-mine]").innerHTML = mine.length ? mine.map((m) => row({ family: m, category: (lib().custom || []).some((c) => c.family === m) ? "importada" : "usada", source: (lib().custom || []).some((c) => c.family === m) ? "custom" : "fontsource" })).join("") : `<p class="fp-note">As fontes que vocês usarem ou importarem aparecem aqui para todo mundo.</p>`;
    box.querySelector("[data-n]").textContent = st.busy ? "Buscando…" : `${st.total} de ${st.of} famílias`;
    box.querySelector("[data-list]").innerHTML = st.list.map(row).join("") || (st.busy ? "" : `<p class="fp-note">Nenhuma fonte com “${esc(st.q)}”. Importe a sua abaixo.</p>`);
    box.querySelectorAll("[data-cat]").forEach((b) => b.classList.toggle("solid", b.dataset.cat === st.cat));
  }
  async function importFont() {
    const fam = box.querySelector("[data-imp-name]").value.trim(), file = box.querySelector("[data-imp-file]").files[0];
    let url = box.querySelector("[data-imp-url]").value.trim();
    const say = (m) => (box.querySelector("[data-imp-msg]").textContent = m);
    if (!/^[\p{L}0-9][\p{L}0-9 \-]{0,59}$/u.test(fam)) return say("Dê um nome para a fonte (ex. Cafofo Display).");
    if (file) {
      if (!/\.(woff2?|ttf|otf)$/i.test(file.name)) return say("Use um arquivo .woff2, .woff, .ttf ou .otf.");
      const C = window.XCLOUD && XCLOUD.on && XCLOUD.client;
      if (!C) return say("Entre no XLIDE para enviar arquivos.");
      say("Enviando…");
      const path = `fonts/${fam.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}.${file.name.split(".").pop().toLowerCase()}`;
      const { error } = await C.storage.from("xlide-media").upload(path, file, { upsert: true, contentType: file.type || "font/" + file.name.split(".").pop() });
      if (error) return say("Não enviou: " + error.message);
      url = C.storage.from("xlide-media").getPublicUrl(path).data.publicUrl;
    }
    if (!/^https:\/\/\S+/i.test(url)) return say("Escolha o arquivo ou cole o link https do arquivo da fonte.");
    const v = lib();
    v.custom = [{ family: fam, url, category: box.querySelector("[data-imp-cat]").value, weight: 400, added: new Date().toISOString() }, ...(v.custom || []).filter((x) => x.family.toLowerCase() !== fam.toLowerCase())];
    saveLib(v);
    XLOOK.loadFont(fam);
    say(`“${fam}” importada. Já dá para usar em qualquer slide.`);
    paint();
  }
  function open(current, cb) {
    cur = current || ""; done = cb;
    const html = `<div class="stack fp"><style>
      .fp-top{display:grid;gap:var(--s2)}
      .fp-cats{display:flex;flex-wrap:wrap;gap:6px}
      .fp-list{display:grid;gap:0;max-height:46vh;overflow:auto;border:1px solid var(--line)}
      .fp-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:var(--s3);padding:10px var(--s3);border-bottom:1px solid var(--line);text-align:left;background:var(--surface)}
      .fp-row:hover,.fp-row.on{background:var(--bg);outline:1px solid var(--fg);outline-offset:-1px}
      .fp-aa{font-size:24px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .fp-meta{font:400 10px var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2)}
      .fp-note{padding:var(--s3);font-size:var(--t-sm);color:var(--fg-2)}
      .fp details{border:1px solid var(--line);padding:var(--s3)} .fp summary{cursor:pointer}
      .fp .imp{display:grid;gap:var(--s2);margin-top:var(--s3)}
    </style>
      <div class="row between"><h2>Fontes</h2><button class="icon-btn" onclick="UI.closeSheet()" aria-label="Fechar">${UI.I.x}</button></div>
      <div class="fp-top"><input class="input" data-q placeholder="Buscar entre todas as fontes (ex. Lexend, Playfair, Satoshi)" value="${esc(st.q)}" autofocus>
        <div class="fp-cats">${CATS.map(([k, n]) => `<button type="button" class="chip" data-cat="${k}">${n}</button>`).join("")}<span class="grow"></span><span class="lbl" data-n></span></div></div>
      <span class="lbl">Da equipe</span><div class="fp-list" data-mine style="max-height:22vh"></div>
      <span class="lbl">Catálogo · Google Fonts, Fontshare e Fontsource</span><div class="fp-list" data-list></div>
      <details><summary class="lbl">Importar fonte (arquivo ou link)</summary><div class="imp">
        <input class="input" data-imp-name placeholder="Nome da fonte (ex. Cafofo Display)">
        <input class="input" type="file" data-imp-file accept=".woff2,.woff,.ttf,.otf">
        <input class="input" data-imp-url placeholder="…ou link https do arquivo .woff2/.ttf/.otf">
        <select class="select" data-imp-cat>${CATS.slice(1).map(([k, n]) => `<option value="${k}" ${k === "display" ? "selected" : ""}>${n}</option>`).join("")}</select>
        <button type="button" class="btn" data-imp>Importar</button><p class="fp-note" data-imp-msg>Use só fontes que vocês têm licença para usar.</p></div></details></div>`;
    UI.sheet(html);
    box = document.querySelector(".sheet .fp") || document.querySelector(".fp");
    box.addEventListener("click", (e) => {
      const r = e.target.closest("[data-fam]"); if (r) { const f = r.dataset.fam; UI.closeSheet(); done && done(f); return; }
      const c = e.target.closest("[data-cat]"); if (c) { st.cat = c.dataset.cat; search(); return; }
      if (e.target.closest("[data-imp]")) importFont();
    });
    box.querySelector("[data-q]").oninput = (e) => { st.q = e.target.value.trim(); clearTimeout(tq); tq = setTimeout(search, 220); };
    paint(); search();
  }
  window.XFONTPICK = { open };
})();
