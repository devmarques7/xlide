/* XLIDE v2 · controles do ao vivo em vários aparelhos.
   Cada console aberto entra no canal privado "xlide-ctl" (Realtime presence) com quem é e de qual aparelho:
   todo mundo vê quem mais está com o controle, e o admin pode tirar um aparelho (broadcast "kick").
   Compartilhar: link (e QR gerado aqui, vendor/qr.js) do console; o outro aparelho entra com o login dele.
   O estado do culto já anda entre aparelhos pelo engine (xlide_runs + Realtime). */
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const DK = "xlide.v2.device";
  let device = localStorage.getItem(DK);
  if (!device) { device = "d" + Math.random().toString(36).slice(2, 10); try { localStorage.setItem(DK, device); } catch {} }
  const ua = navigator.userAgent;
  const kind = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "Tablet" : /iPhone|Android.+Mobile|Mobile/i.test(ua) ? "Celular" : "Computador";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "";
  const label = `${kind}${os ? " · " + os : ""}`;
  const CL = window.XCLOUD && XCLOUD.on && !XCLOUD.leaving && XCLOUD.client ? XCLOUD : null;
  const uid = CL ? CL.uid : (window.XL && XL.me) || "local";
  const nameOf = (u) => (window.XL && XL.people && XL.people[u] && XL.people[u].name) || "Alguém da equipe";
  const isAdmin = () => !!(CL && CL.role === "admin");
  const subs = new Set();
  let list = [], ch = null, kicked = null;
  const since = Date.now();
  const emit = () => subs.forEach((f) => f(list));

  function join() {
    if (!CL) { list = [{ device, uid, name: nameOf(uid), label, since, me: true }]; emit(); return; }
    ch = CL.client.channel("xlide-ctl", { config: { private: true, presence: { key: device }, broadcast: { self: false } } });
    ch.on("presence", { event: "sync" }, () => {
      const st = ch.presenceState();
      list = Object.entries(st).map(([key, metas]) => ({ ...(metas[metas.length - 1] || {}), device: key, me: key === device }))
        .sort((a, b) => Number(b.me) - Number(a.me) || (a.since || 0) - (b.since || 0));
      emit();
    });
    ch.on("broadcast", { event: "kick" }, ({ payload }) => { if (payload && payload.device === device) block(payload); });
    ch.subscribe((s) => { if (s === "SUBSCRIBED") ch.track({ uid, name: nameOf(uid), label, since, demo: !!(window.LIVE && LIVE.demo), role: CL.role || "" }); });
  }

  /* tirado do controle: a tela fica bloqueada (teclado também) até a pessoa sair ou entrar de novo */
  function block(p) {
    kicked = p;
    try { sessionStorage.setItem("xlide.v2.kicked", JSON.stringify({ by: p.byName, at: Date.now() })); } catch {}
    ch && ch.untrack();
    const ov = document.createElement("div");
    ov.className = "ctl-kicked";
    ov.innerHTML = `<div><span class="lbl">Controle do ao vivo</span><h2>Este aparelho saiu do controle</h2><p>${esc(p.byName || "O admin")} tirou este ${esc(label.split(" · ")[0].toLowerCase())} do controle do programa.</p>
      <div class="row" style="gap:8px;justify-content:center"><a class="btn" href="inicio.html">Voltar ao início</a><button class="btn ghost" type="button" onclick="sessionStorage.removeItem('xlide.v2.kicked');location.reload()">Pedir para entrar de novo</button></div></div>`;
    document.body.append(ov);
    addEventListener("keydown", (e) => { e.stopImmediatePropagation(); }, true);
  }

  function kick(dev) {
    if (!isAdmin() || !ch || dev === device) return false;
    ch.send({ type: "broadcast", event: "kick", payload: { device: dev, by: uid, byName: nameOf(uid) } });
    return true;
  }

  const link = () => `${location.origin}/v2/console.html${window.LIVE && LIVE.demo ? "?demo=1" : ""}`;
  const ago = (t) => { const m = Math.round((Date.now() - (t || Date.now())) / 60000); return m < 1 ? "agora" : m < 60 ? `há ${m} min` : `há ${Math.round(m / 60)} h`; };

  /* folha: QR + link para outro aparelho, e a lista de quem está com o controle */
  function sheet() {
    const u = link();
    const rows = () => list.map((c) => `<div class="ctl-row${c.me ? " me" : ""}"><span class="ctl-av">${esc((c.name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase())}</span>
      <span class="grow" style="min-width:0"><b>${esc(c.name)}${c.me ? " · este aparelho" : ""}</b><small>${esc(c.label || "")}${c.demo ? " · demo" : ""} · entrou ${ago(c.since)}</small></span>
      ${!c.me && isAdmin() ? `<button class="btn ghost sm" data-kick="${esc(c.device)}">Remover</button>` : ""}</div>`).join("") || `<p class="muted">Só este aparelho.</p>`;
    UI.sheet(`<div class="stack ctl-sh">
      <div class="row between"><h2>Compartilhar o controle</h2><button class="icon-btn" onclick="UI.closeSheet()" aria-label="Fechar">${UI.I.x}</button></div>
      <div class="ctl-share"><div class="ctl-qr">${window.XQR ? XQR.svg(u) : ""}</div>
        <div class="stack" style="gap:8px;min-width:0"><p>Aponte a câmera do outro aparelho para o QR ou mande o link. A pessoa entra com o login dela no XLIDE e controla este programa junto${window.LIVE && LIVE.demo ? " (em demo)" : ""}.</p>
          <div class="row" style="gap:6px"><input class="input" readonly value="${esc(u)}" style="flex:1;min-width:0" onclick="this.select()"><button class="btn" type="button" id="ctl-copy">Copiar</button></div>
          <p class="muted" style="font-size:var(--t-xs)">Precisa ser da equipe com permissão de operar o ao vivo (admin, editor ou operador).</p></div></div>
      <div class="section-h"><span class="lbl">Com o controle agora</span><span class="lbl" id="ctl-n"></span></div>
      <div class="ctl-list" id="ctl-list">${rows()}</div>
      ${isAdmin() ? `<p class="muted" style="font-size:var(--t-xs)">Como admin, você pode tirar um aparelho do controle.</p>` : ""}</div>`);
    const paint = () => { const el = document.getElementById("ctl-list"); if (!el) return off(); el.innerHTML = rows(); document.getElementById("ctl-n").textContent = `${list.length} ${list.length === 1 ? "aparelho" : "aparelhos"}`; };
    const off = on(paint); paint();
    document.getElementById("ctl-copy").onclick = async (e) => { try { await navigator.clipboard.writeText(u); e.target.textContent = "Copiado"; } catch { e.target.textContent = "Copie o link"; } };
    document.querySelector(".ctl-sh").addEventListener("click", (e) => {
      const b = e.target.closest("[data-kick]"); if (!b) return;
      const c = list.find((x) => x.device === b.dataset.kick);
      if (b.dataset.ok) { kick(b.dataset.kick); b.textContent = "Removido"; b.disabled = true; return; }
      b.dataset.ok = "1"; b.textContent = `Tirar ${c ? c.name.split(" ")[0] : ""}?`; b.classList.add("danger-fill");
    });
  }

  function on(f) { subs.add(f); f(list); return () => subs.delete(f); }
  window.XCTL = { join, on, kick, sheet, link, device, label, get list() { return list; }, isAdmin };
})();
