/* XLIDE v2 · edição direto no slide (como no Canva).
   Clique num bloco para selecionar; clique de novo (ou duplo clique) para escrever ali mesmo.
   Arraste para mover; as alças das laterais mudam a largura e as dos cantos mudam o tamanho.
   A barra de cima troca fonte, tamanho, cor, negrito, alinhamento e posição; em decks, decide
   se o ajuste vale para todos os slides, só para este, ou copia para o próximo.
   Usado no Estúdio (Testar), na gaveta (Programa, Biblioteca) e na página de campos.
   No app real: o editor de slides do XLIDE (Editor.tsx) com a mesma barra.

   CANVAS.attach(stage, {
     view(),          → objeto que o slide mostra (eyebrow, title, text, bg, font, ink, layout, seconds…)
     layout(),        → o layout que a edição muda (compartilhado ou só deste slide)
     text(campo, v),  → grava o texto digitado no slide ("eyebrow" | "title" | "text")
     changed(tipo),   → avisa o resto da tela ("move" | "style" | "text" | "select")
     scope?()         → em decks: { i, n, own, all(), only(), next(), go(d) }
   }) → { render(), select(k), get sel() } */
(function () {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const NAMES = { eb: "Rótulo", t: "Título", b: "Texto", tm: "Timer", img: "Imagem" };
  const FIELD = { eb: "eyebrow", t: "title", b: "text" };
  const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">${d}</svg>`;
  const IC = {
    al: { left: P('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'), center: P('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'), right: P('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>') },
    img: P('<rect x="3" y="4" width="18" height="16"/><path d="m3 16 5-5 5 5 3-3 5 5"/><circle cx="16" cy="9" r="1.5"/>'),
    eye: P('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>'),
    pen: P('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
    mid: P('<path d="M12 3v18M3 12h18"/><rect x="8" y="8" width="8" height="8"/>'),
  };

  function attach(stage, o) {
    let sel = null, editing = null, drag = null;
    const wrap = document.createElement("div");
    wrap.className = "cv";
    stage.before(wrap);
    const bar = document.createElement("div");
    bar.className = "cv-bar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Editar o bloco selecionado");
    const row = document.createElement("div");
    row.className = "cv-row";
    const ctx = document.createElement("div");
    ctx.className = "cv-ctx";
    const file = document.createElement("input");
    file.type = "file"; file.accept = "image/*"; file.hidden = true;
    wrap.append(bar, row, stage, ctx, file);
    stage.classList.add("cv-stage");
    stage.tabIndex = 0;

    const L = () => o.layout();
    const B = () => (sel ? L()[sel] : null);
    const font = (id) => XLOOK.FONTS.find((f) => f.id === id) || XLOOK.FONTS[0];

    /* ── desenhar ── */
    function render() {
      if (editing) return; // não apaga o que a pessoa está digitando
      XLOOK.mount(stage, DRAWER.template(o.view(), { edit: true }));
      if (sel && !(L()[sel] && L()[sel].on)) sel = null;
      stage.querySelectorAll(".tpl-blk").forEach((el) => el.classList.toggle("sel", el.dataset.b === sel));
      paintBar(); place();
    }
    function place() {
      const el = sel && stage.querySelector(`[data-b="${sel}"]`);
      if (!el) { ctx.classList.remove("on"); return; }
      const w = wrap.getBoundingClientRect(), r = el.getBoundingClientRect();
      ctx.classList.add("on");
      const top = r.top - w.top - ctx.offsetHeight - 10;
      ctx.style.top = (top < bar.offsetHeight + 4 ? r.bottom - w.top + 10 : top) + "px";
      ctx.style.left = clamp(r.left - w.left + r.width / 2 - ctx.offsetWidth / 2, 0, w.width - ctx.offsetWidth) + "px";
    }

    /* ── barra de cima ── */
    function paintBar() {
      const b = B(), sc = o.scope ? o.scope() : null;
      const scope = sc && sc.n > 1 ? `<span class="cv-scope"><button data-go="-1" aria-label="Slide anterior" ${sc.i ? "" : "disabled"}>‹</button><span class="lbl">Slide ${sc.i + 1}/${sc.n}</span><button data-go="1" aria-label="Próximo slide" ${sc.i < sc.n - 1 ? "" : "disabled"}>›</button></span>
        <span class="seg cv-seg" title="Onde o ajuste vale"><button data-scope="all" class="${sc.own ? "" : "on"}">Todos os slides</button><button data-scope="only" class="${sc.own ? "on" : ""}">Só este</button></span>
        ${sc.i < sc.n - 1 ? `<button class="cv-b" data-scope="next" title="Copia o layout deste slide para o próximo">Aplicar no próximo</button>` : ""}` : "";
      row.innerHTML = scope;
      row.hidden = !scope;
      if (!b) {
        const hidden = Object.entries(L()).filter(([k, x]) => x && !x.on && NAMES[k] && (k !== "tm" || o.view().seconds) && k !== "img");
        bar.innerHTML = `<span class="cv-hint">Clique num texto para editar. Clique de novo para escrever.</span>${hidden.map(([k]) => `<button class="cv-b" data-show="${k}">+ ${NAMES[k]}</button>`).join("")}<button class="cv-b" data-addimg>${IC.img}<span>Imagem</span></button>`;
        ctx.innerHTML = "";
        return;
      }
      const v = o.view(), F = font(b.f || v.font), isImg = sel === "img", bold = sel === "t" ? b.bo !== false : !!b.bo;
      const fontSel = isImg ? "" : `<select class="cv-font" data-font aria-label="Fonte"><option value="">Fonte do slide (${font(v.font).name})</option>${XLOOK.FONTS.map((f) => `<option value="${f.id}" ${b.f === f.id ? "selected" : ""}>${f.name}</option>`).join("")}</select>`;
      const size = `<span class="cv-num"><button data-size="-1" aria-label="Diminuir">−</button><b>${isImg ? Math.round(b.w) + "%" : Math.round(b.s * 10)}</b><button data-size="1" aria-label="Aumentar">+</button></span>`;
      const color = isImg ? "" : `<span class="cv-inks" aria-label="Cor"><button class="sw auto${b.c ? "" : " on"}" data-ink="" title="Automática">A</button>${XLOOK.INKS.map((c) => `<button class="sw${b.c === c ? " on" : ""}" data-ink="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join("")}</span>`;
      const style = isImg || sel === "tm" ? "" : `<button class="cv-i${bold ? " on" : ""}" data-bold aria-pressed="${bold}" title="Negrito"><b>B</b></button>`;
      const al = isImg ? "" : `<button class="cv-i" data-align title="Alinhamento: ${b.a}">${IC.al[b.a] || IC.al.center}</button>`;
      const box = sel === "tm" ? `<button class="cv-b${b.box ? " on" : ""}" data-box>Caixa</button>` : "";
      const pos = `<select class="cv-pos" data-pos aria-label="Posição"><option value="">Posição</option><option value="top">Topo</option><option value="middle">Meio</option><option value="bottom">Base</option><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select>`;
      const swap = isImg ? `<button class="cv-b" data-addimg>Trocar imagem</button>` : "";
      bar.innerHTML = `<span class="cv-name">${NAMES[sel]}</span>${fontSel}${size}${color}${style}${al}${box}${swap}${pos}`;
      ctx.innerHTML = `${FIELD[sel] ? `<button data-edit>${IC.pen}<span>Escrever</span></button>` : ""}<button data-mid title="Centralizar na tela">${IC.mid}</button><button data-hide title="Ocultar (Delete)">${IC.eye}</button>`;
    }

    /* ── selecionar e escrever ── */
    function select(k) {
      if (editing) stopEdit();
      sel = k;
      render();
      o.changed && o.changed("select", k);
    }
    function startEdit(k, x, y) {
      if (!FIELD[k]) return;
      if (sel !== k) select(k);
      const el = stage.querySelector(`[data-b="${k}"] .tx`);
      if (!el) return;
      editing = k;
      el.parentElement.classList.add("editing");
      el.contentEditable = "plaintext-only";
      el.spellcheck = false;
      el.focus();
      const rg = x != null && document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
      const s = getSelection();
      if (rg && el.contains(rg.startContainer)) { s.removeAllRanges(); s.addRange(rg); }
      else { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
      el.oninput = () => { o.text(FIELD[k], el.innerText.replace(/\n$/, "")); o.changed && o.changed("text", k); place(); };
      el.onblur = () => setTimeout(() => { if (editing === k && !stage.contains(document.activeElement)) { stopEdit(); render(); } }, 0);
      el.onkeydown = (e) => { if (e.key === "Escape") { e.preventDefault(); stopEdit(); render(); stage.focus(); } };
    }
    function stopEdit() {
      const el = editing && stage.querySelector(`[data-b="${editing}"] .tx`);
      if (el) { el.contentEditable = "false"; el.parentElement.classList.remove("editing"); }
      editing = null;
    }

    /* ── arrastar, largura e tamanho ── */
    stage.addEventListener("pointerdown", (e) => {
      const el = e.target.closest(".tpl-blk");
      if (!el) { if (editing) stopEdit(); if (sel) { sel = null; render(); o.changed && o.changed("select", null); } return; }
      const k = el.dataset.b;
      if (editing === k && !e.target.closest(".h")) return; // clicando dentro do texto: mover o cursor
      e.preventDefault();
      const was = sel === k;
      if (!was) select(k);
      const b = L()[k], live = stage.querySelector(`[data-b="${k}"]`), r = stage.getBoundingClientRect(), br = live.getBoundingClientRect();
      const h = e.target.closest(".h");
      drag = { k, el: live, mode: h ? (h.classList.contains("c") ? "scale" : h.classList.contains("hl") ? "wl" : "wr") : "move", sx: e.clientX, sy: e.clientY, r, ox: b.x, oy: b.y, ow: b.w, os: b.s, cx: br.left + br.width / 2, cy: br.top + br.height / 2, moved: false, was };
      drag.d0 = Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) || 1;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = ((e.clientX - drag.sx) / drag.r.width) * 100, dy = ((e.clientY - drag.sy) / drag.r.height) * 100, b = L()[drag.k];
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 3) return;
      drag.moved = true;
      if (drag.mode === "wr" || drag.mode === "wl") { b.w = Math.round(clamp(drag.ow + (drag.mode === "wr" ? dx : -dx) * 2, 6, 100)); drag.el.style.width = b.w + "%"; place(); return; }
      if (drag.mode === "scale") {
        const k = Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) / drag.d0;
        if (drag.k === "img") { b.w = Math.round(clamp(drag.ow * k, 6, 100)); drag.el.style.width = b.w + "%"; }
        else { b.s = +clamp(drag.os * k, 0.6, 30).toFixed(2); drag.el.style.fontSize = b.s + "cqw"; b.w = Math.round(clamp(drag.ow * k, 6, 100)); drag.el.style.width = b.w + "%"; }
        place(); return;
      }
      let x = drag.ox + dx, y = drag.oy + dy;
      const sx = Math.abs(x - 50) < 1.5, sy = Math.abs(y - 50) < 2;
      if (sx) x = 50; if (sy) y = 50;
      b.x = +clamp(x, 0, 100).toFixed(1); b.y = +clamp(y, 0, 100).toFixed(1);
      drag.el.style.left = b.x + "%"; drag.el.style.top = b.y + "%";
      stage.querySelector(".gv")?.classList.toggle("on", sx); stage.querySelector(".gh")?.classList.toggle("on", sy);
      place();
    });
    const end = (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      stage.querySelectorAll(".guide").forEach((g) => g.classList.remove("on"));
      if (d.moved) { render(); o.changed && o.changed(d.mode === "move" ? "move" : "style", d.k); }
      else if (d.was && d.mode === "move" && FIELD[d.k]) startEdit(d.k, e.clientX, e.clientY); // segundo clique: escrever
    };
    stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
    stage.addEventListener("dblclick", (e) => { const el = e.target.closest(".tpl-blk"); if (el && !editing) startEdit(el.dataset.b, e.clientX, e.clientY); });

    /* ── barra e menu do bloco ── */
    const style = () => { if (editing) stopEdit(); render(); o.changed && o.changed("style", sel); };
    function onBar(e) {
      const t = e.target.closest("button");
      if (!t || t.disabled) return;
      e.preventDefault();
      const ds = t.dataset, b = B();
      if (ds.go) return o.scope().go(+ds.go), (sel = sel && L()[sel]?.on ? sel : null), render();
      if (ds.scope) { o.scope()[ds.scope](); render(); o.changed && o.changed("style", sel); return; }
      if (ds.show) { L()[ds.show].on = true; return select(ds.show); }
      if (ds.addimg != null) return file.click();
      if (ds.edit != null) return startEdit(sel);
      if (!b) return;
      if (ds.size) { const d = +ds.size; if (sel === "img") b.w = clamp(b.w + d * 5, 6, 100); else b.s = +clamp(b.s * (d > 0 ? 1.1 : 1 / 1.1), 0.6, 30).toFixed(2); return style(); }
      if (ds.ink != null) { if (ds.ink) b.c = ds.ink; else delete b.c; return style(); }
      if (ds.bold != null) { b.bo = sel === "t" ? b.bo === false : !b.bo; return style(); }
      if (ds.align != null) { b.a = { left: "center", center: "right", right: "left" }[b.a] || "center"; return style(); }
      if (ds.box != null) { b.box = !b.box; return style(); }
      if (ds.mid != null) { b.x = 50; b.y = 50; return style(); }
      if (ds.hide != null) { b.on = false; sel = null; render(); o.changed && o.changed("style", null); }
    }
    bar.addEventListener("mousedown", (e) => { if (e.target.closest("button")) e.preventDefault(); });
    bar.addEventListener("click", onBar); ctx.addEventListener("click", onBar); row.addEventListener("click", onBar);
    row.addEventListener("mousedown", (e) => { if (e.target.closest("button")) e.preventDefault(); });
    ctx.addEventListener("mousedown", (e) => e.preventDefault());
    bar.addEventListener("change", (e) => {
      const b = B(); if (!b) return;
      if (e.target.dataset.font != null) { if (e.target.value) b.f = e.target.value; else delete b.f; return style(); }
      if (e.target.dataset.pos != null) {
        const v = e.target.value;
        if (v === "top") b.y = 14; if (v === "middle") b.y = 50; if (v === "bottom") b.y = 86;
        if (v === "left") { b.x = b.w / 2 + 6; b.a = "left"; } if (v === "center") { b.x = 50; b.a = "center"; } if (v === "right") { b.x = 100 - b.w / 2 - 6; b.a = "right"; }
        return style();
      }
    });
    file.onchange = () => {
      const f = file.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { const lay = L(); lay.img = { ...(lay.img || { x: 78, y: 50, w: 28, s: 1, a: "center" }), on: true, src: rd.result }; file.value = ""; select("img"); o.changed && o.changed("style", "img"); };
      rd.readAsDataURL(f);
    };

    /* ── teclado: setas movem, Delete oculta, Enter escreve, Esc solta ── */
    let active = false;
    wrap.addEventListener("pointerdown", () => (active = true), true);
    document.addEventListener("pointerdown", (e) => { if (!wrap.contains(e.target)) active = false; }, true);
    addEventListener("keydown", (e) => {
      if (!active || !sel || editing || !wrap.isConnected) return;
      if (e.target.closest("input, textarea, select, [contenteditable='plaintext-only']")) return;
      const b = B(), n = e.shiftKey ? 5 : 1;
      if (/^Arrow/.test(e.key)) {
        e.preventDefault(); e.stopPropagation();
        if (e.key === "ArrowLeft") b.x = clamp(b.x - n, 0, 100); if (e.key === "ArrowRight") b.x = clamp(b.x + n, 0, 100);
        if (e.key === "ArrowUp") b.y = clamp(b.y - n, 0, 100); if (e.key === "ArrowDown") b.y = clamp(b.y + n, 0, 100);
        return style();
      }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); b.on = false; sel = null; render(); o.changed && o.changed("style", null); return; }
      if (e.key === "Enter") { e.preventDefault(); return startEdit(sel); }
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); sel = null; render(); o.changed && o.changed("select", null); }
    }, true);
    addEventListener("resize", place);

    render();
    return { render, select, get sel() { return sel; }, get editing() { return editing; } };
  }

  window.CANVAS = { attach };
})();
