/* XLIDE v2 · importar PDF (o pastor traz os slides do sermão em PDF).
   Cada página vira uma imagem (pdf.js, no navegador) e sobe para o Storage (bucket xlide-media).
   O resultado vira um deck do XLIDE (xlide_decks, layout "image" variante "page"), aparece na Biblioteca,
   em Meus arquivos, no editor de deck e no Programa, e é projetado página por página no ao vivo.
   Sem Supabase (mockup), as páginas ficam como imagens no navegador. */
(function () {
  const VENDOR = new URL("vendor/", document.currentScript ? document.currentScript.src : location.href).href;
  let lib = null;
  async function pdfjs() {
    if (lib) return lib;
    lib = await import(VENDOR + "pdf.min.mjs");
    lib.GlobalWorkerOptions.workerSrc = VENDOR + "pdf.worker.min.mjs";
    return lib;
  }
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const MAX_PAGES = 120, MAX_MB = 80, WIDTH = 1920;

  /* barra de progresso simples, por cima de tudo */
  function progress() {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgb(0 0 0 / .55)";
    el.innerHTML = `<div style="width:min(360px,90vw);padding:20px;background:var(--surface,#fff);color:var(--fg,#161615);display:grid;gap:10px;font:500 14px var(--font,system-ui)"><b data-t>Lendo o PDF…</b><div style="height:6px;background:var(--line,#ddd)"><i data-b style="display:block;height:100%;width:0;background:var(--live,#1f4bd8);transition:width .2s"></i></div><small data-s style="color:var(--fg-2,#666)"></small></div>`;
    document.body.append(el);
    return {
      set(t, k, n) { el.querySelector("[data-t]").textContent = t; el.querySelector("[data-b]").style.width = n ? Math.round((k / n) * 100) + "%" : "0"; el.querySelector("[data-s]").textContent = n ? `Página ${k} de ${n}` : ""; },
      done() { el.remove(); },
    };
  }

  async function upload(blob, path) {
    const C = window.XCLOUD && XCLOUD.on && XCLOUD.client;
    if (!C) return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    const { error } = await C.storage.from("xlide-media").upload(path, blob, { upsert: true, contentType: blob.type });
    if (error) throw new Error("Não subiu a página: " + error.message);
    return C.storage.from("xlide-media").getPublicUrl(path).data.publicUrl;
  }

  /** Lê o PDF e devolve { name, pages: [url], ratio, deckId }. */
  async function convert(file) {
    if (!file) throw new Error("Nenhum arquivo");
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) throw new Error("Esse arquivo não é um PDF");
    if (file.size > MAX_MB * 1048576) throw new Error(`PDF grande demais (máximo ${MAX_MB} MB)`);
    const bar = progress();
    try {
      const L = await pdfjs();
      const pdf = await L.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const n = Math.min(pdf.numPages, MAX_PAGES);
      const deckId = uid("pdf_"), name = file.name.replace(/\.pdf$/i, "");
      const pages = []; let ratio = 16 / 9;
      for (let i = 1; i <= n; i++) {
        bar.set("Convertendo páginas…", i - 1, n);
        const page = await pdf.getPage(i);
        const v0 = page.getViewport({ scale: 1 });
        if (i === 1) ratio = v0.width / v0.height;
        const vp = page.getViewport({ scale: WIDTH / v0.width });
        const cv = document.createElement("canvas");
        cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.86));
        bar.set("Enviando…", i - 0.5, n);
        pages.push(await upload(blob, `v2/pdf/${deckId}/${String(i).padStart(3, "0")}.jpg`));
        page.cleanup();
      }
      bar.set("Criando o deck…", n, n);
      await saveDeck(deckId, name, pages);
      return { name, pages, ratio, deckId, truncated: pdf.numPages > MAX_PAGES, total: pdf.numPages };
    } finally { bar.done(); }
  }

  /* deck do XLIDE (o mesmo formato do editor clássico e do MCP): uma página por slide */
  async function saveDeck(id, name, pages) {
    const now = Date.now();
    const doc = { id, title: name, languages: ["pt"], defaultLanguage: "pt", template: "editorial", tags: ["pdf"], source: "pdf",
      slides: pages.map((url, k) => ({ id: `${id}_${k + 1}`, layout: "image", variant: "page", image: url, tone: "dark" })), createdAt: now, updatedAt: now };
    const C = window.XCLOUD && XCLOUD.on && XCLOUD.client;
    if (C) {
      const { error } = await C.from("xlide_decks").upsert({ id, kind: "deck", title: name, doc, owner_id: XCLOUD.uid, source: "pdf" });
      if (error) throw new Error("O deck não foi salvo: " + error.message);
    }
    // já aparece nesta página (Biblioteca, gaveta), sem esperar recarregar
    if (window.XL && XL.decks) XL.decks[id] = { title: name, kind: "deck", slides: pages.length, layout: "image", updated: "agora", cover: pages[0], pages, real: true };
    return doc;
  }

  /* slides do editor de deck v2: a página é o fundo, sem texto por cima */
  const editorSlides = (pages) => pages.map((url) => ({ eyebrow: "", title: "", text: "", image: url, pdf: true,
    layout: { name: "PDF", eb: { x: 50, y: 36, w: 70, s: 1.5, a: "center", on: false }, t: { x: 50, y: 48, w: 80, s: 6.4, a: "center", on: false }, b: { x: 50, y: 62, w: 66, s: 2.6, a: "center", on: false }, tm: { x: 91, y: 91, w: 14, s: 3, a: "center", on: false, box: true } } }));

  /* Meus arquivos: o PDF entra como arquivo (pasta escolhida) e já abre no editor de deck */
  function toFile(r, folder = "pregacao") {
    const id = "f" + r.deckId.slice(4);
    const f = { id, name: r.name, folder, kind: "deck", status: "ativo", star: false, owner: window.UI ? UI.me() : "me", shared: [], slides: r.pages.length,
      bg: "solid:#0e0e0d", image: r.pages[0], pages: r.pages, deck: r.deckId, font: "grotesk", eyebrow: "", title: "", text: "", layout: editorSlides([r.pages[0]])[0].layout, updated: "agora", desc: `PDF importado · ${r.pages.length} páginas` };
    window.FILES && FILES.add(f);
    try {
      const K = "xlide.v2.decks", st = JSON.parse(localStorage.getItem(K)) || {};
      st["f:" + id] = { name: r.name, folder, bg: "solid:#0e0e0d", font: "grotesk", ink: null, images: [], slides: editorSlides(r.pages) };
      localStorage.setItem(K, JSON.stringify(st));
    } catch {}
    return f;
  }

  /* item do Programa: sermão (ou o tipo pedido) que projeta as páginas */
  const toItem = (r, type = "sermon") => ({ id: uid("i_"), type, title: r.name, planned: Math.max(300, r.pages.length * 60), advance: "manual", public: true, deck: r.deckId, pages: r.pages, text: `PDF · ${r.pages.length} páginas` });

  /** Abre o seletor de arquivo e converte. onDone(r) recebe o resultado; erros aparecem num aviso. */
  function pick(onDone) {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/pdf,.pdf";
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      try { const r = await convert(f); onDone && onDone(r); if (r.truncated) notice(`O PDF tem ${r.total} páginas; entraram as primeiras ${MAX_PAGES}.`); }
      catch (e) { notice(String((e && e.message) || e)); }
    };
    inp.click();
  }
  function notice(t) {
    const n = document.createElement("div");
    n.textContent = t;
    n.style.cssText = "position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10001;padding:10px 16px;background:var(--late,#c0392b);color:#fff;font:500 13px var(--font,system-ui)";
    document.body.append(n); setTimeout(() => n.remove(), 5000);
  }

  window.PDFIMPORT = { pick, convert, toFile, toItem, editorSlides, notice };
})();
