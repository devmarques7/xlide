/* XLIDE v2 · simulação do motor ao vivo (ADR-003).
   Estado = carimbos de tempo; o tempo é sempre calculado (computeTiming).
   No app real: tabela live_runs + RPCs live_run_* com expected_version + Supabase Realtime.
   Aqui: localStorage + BroadcastChannel, então console, tela e página pública
   abertos em abas diferentes andam juntos. Relógio virtual com velocidade (×1, ×10, ×60). */
(function () {
  const KEY = "xlide.v2.run";
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("xlide-v2-live") : null;
  const subs = new Set();
  const items = () => XL.program.items;

  const fresh = () => ({
    status: "idle", index: 0, slide: 0, itemStart: 0, pausedAt: 0, pausedMs: 0, ext: 0, extCount: 0,
    runStart: 0, log: [], version: 0, offline: false, transition: "fade",
    clock: { base: Date.now(), real: Date.now(), speed: 1 },
  });

  let st = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } }
  function save() {
    st.version++;
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {}
    bc && bc.postMessage(st);
    emit();
  }
  function emit() { subs.forEach((f) => f(st)); }
  bc && (bc.onmessage = (e) => { st = e.data; emit(); });
  window.addEventListener("storage", (e) => { if (e.key === KEY) { st = load(); emit(); } });

  const now = () => st.clock.base + (Date.now() - st.clock.real) * st.clock.speed;

  function slidesOf(it) {
    if (it.type === "song") return XL.songSlides(it.song);
    if (it.deck) return Array.from({ length: Math.min(XL.decks[it.deck].slides, 6) }, (_, i) => ({ section: "", text: i ? `${it.title} · ${i + 1}` : it.title }));
    return [{ section: "", text: it.title }];
  }

  function closeItem(t, skipped) {
    const L = st.log[st.index] || (st.log[st.index] = {});
    L.end = t; L.ext = st.extCount; L.skipped = !!skipped;
  }
  function openItem(i, t) {
    st.index = i; st.slide = 0; st.itemStart = t; st.pausedMs = 0; st.ext = 0; st.extCount = 0;
    if (st.status === "paused") st.pausedAt = t;
    st.log[i] = { start: t, by: XL.me };
  }

  const cmd = {
    play() {
      const t = now();
      if (st.status === "idle" || st.status === "done") { const c = st.clock; st = fresh(); st.clock = c; st.status = "live"; st.runStart = t; openItem(0, t); }
      else if (st.status === "paused") { st.pausedMs += t - st.pausedAt; st.pausedAt = 0; st.status = "live"; }
      save();
    },
    pause() { if (st.status !== "live") return; st.status = "paused"; st.pausedAt = now(); save(); },
    toggle() { st.status === "live" ? cmd.pause() : cmd.play(); },
    next(skipped) {
      if (st.status === "idle") return cmd.play();
      if (st.status === "done") return;
      const t = now(); closeItem(t, skipped);
      // itens ocultos (Programa → Ocultar) ficam no programa, mas o ao vivo pula
      let j = st.index + 1; while (j < items().length && items()[j].hidden) j++;
      if (j >= items().length) { st.status = "done"; save(); return; }
      openItem(j, t); save();
    },
    prev() { if (st.status === "idle" || st.index === 0) return; const t = now(); closeItem(t); openItem(st.index - 1, t); save(); },
    goto(i) { if (st.status === "idle") cmd.play(); const t = now(); closeItem(t, i > st.index + 1); openItem(i, t); save(); },
    extend(sec) { if (st.status === "idle" || st.status === "done") return; st.ext += sec; st.extCount++; save(); },
    slide(d) {
      const n = slidesOf(items()[st.index]).length;
      const s = st.slide + d;
      if (s >= n && d > 0) return cmd.next();
      st.slide = Math.max(0, Math.min(n - 1, s)); save();
    },
    at(i, k) { if (i !== st.index || st.status === "idle") cmd.goto(i); const n = slidesOf(items()[i]).length; st.slide = Math.max(0, Math.min(n - 1, k)); save(); },
    finish() { if (st.status === "idle") return; closeItem(now()); st.status = "done"; save(); },
    reset() { const c = st.clock, t = st.transition, ap = !!st.autopilot; st = fresh(); st.clock = { base: Date.now(), real: Date.now(), speed: c.speed }; st.transition = t || "fade"; st.autopilot = ap; save(); },
    // transição entre telas: "corte" | "fade" (padrão) | "slide" | "sobrepor"
    transition(t) { st.transition = t; save(); },
    autopilot(v = !st.autopilot) { st.autopilot = v; save(); },
    speed(x) { st.clock = { base: now(), real: Date.now(), speed: x }; save(); },
    offline(v) { st.offline = v; save(); },
  };

  /* Função pura no app real (src/live/timing.ts, com testes). */
  function timing(s = st, t = now()) {
    const its = items();
    const total = its.reduce((a, b) => a + b.planned, 0);
    const it = its[s.index];
    const pausedNow = s.status === "paused" ? t - s.pausedAt : 0;
    const elapsed = s.status === "idle" ? 0 : Math.max(0, (s.status === "done" ? (s.log[s.index]?.end ?? t) : t) - s.itemStart - s.pausedMs - pausedNow) / 1000;
    const budget = it.planned + s.ext;
    const remaining = budget - elapsed;
    const after = its.slice(s.index + 1).reduce((a, b) => a + b.planned, 0);
    const base = s.status === "idle" ? t : s.runStart;
    const projectedEnd = s.status === "idle" ? t + total * 1000 : s.status === "done" ? (s.log[s.index]?.end ?? t) : t + (Math.max(0, remaining) + after) * 1000;
    const plannedEnd = base + total * 1000;
    const delay = Math.round((projectedEnd - plannedEnd) / 1000);
    // horários previstos por item: reais para os já passados, projetados para os seguintes
    const starts = []; let cur = base;
    its.forEach((x, i) => {
      if (s.status === "idle") { starts.push(cur); cur += x.planned * 1000; return; }
      if (i < s.index) { starts.push(s.log[i]?.start ?? s.runStart); return; }
      if (i === s.index) { starts.push(s.itemStart); cur = t + Math.max(0, remaining) * 1000; return; }
      starts.push(cur); cur += x.planned * 1000;
    });
    return { it, elapsed, budget, remaining, over: remaining < 0, progress: Math.min(1, elapsed / budget), projectedEnd, plannedEnd, delay, starts, total, next: its[s.index + 1], base };
  }

  // Avanço automático: só quem "dirige" (o console) dispara.
  function drive() {
    setInterval(() => {
      if (st.status !== "live") return;
      const T = timing(); const it = T.it;
      // piloto automático: todo item passa quando o tempo acaba, e os slides de um item
      // se dividem pelo tempo dele (música segue a própria faixa no console)
      if ((it.advance === "auto" || st.autopilot) && T.remaining <= 0) return cmd.next();
      if (st.autopilot && it.type !== "song") {
        const n = slidesOf(it).length;
        if (n > 1) { const k = Math.min(n - 1, Math.floor(T.elapsed / ((it.planned + st.ext) / n))); if (k > st.slide) { st.slide = k; save(); } }
      }
    }, 250);
  }

  // Relógio de parede exibido: 10:00 + tempo desde o início da execução.
  const START = (() => { const [h, m] = XL.program.starts.split(":").map(Number); return h * 60 + m; })();
  function wall(ms) {
    const base = st.status === "idle" ? now() : st.runStart;
    const min = START + (ms - base) / 60000;
    const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const mmss = (sec) => { const neg = sec < 0; sec = Math.abs(Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return `${neg ? "+" : ""}${m}:${String(s).padStart(2, "0")}`; };
  const dmin = (sec) => (Math.abs(sec) < 30 ? "no horário" : `${sec > 0 ? "+" : "−"}${Math.round(Math.abs(sec) / 60)} min`);

  window.LIVE = {
    get state() { return st; }, cmd, timing, drive, slidesOf, wall, mmss, dmin, now,
    on(f) { subs.add(f); f(st); return () => subs.delete(f); },
    loop(f) { const tick = () => { f(st, timing()); requestAnimationFrame(tick); }; tick(); },
  };
})();
