/* XLIDE v2 · dados fictícios. No app real vêm do Supabase:
   people → profiles (Classe) · roles → live_roles · songs/decks → xlide_decks
   program/items → live_programs / live_program_items.
   As letras são de exemplo, escritas para o mockup. */
(function () {
  const people = {
    ana: { name: "Ana Ribeiro", ini: "AR", role: "admin", area: null, title: "Diretora geral" },
    lucas: { name: "Lucas Prado", ini: "LP", role: "editor", area: "music", title: "Diretor de música" },
    bia: { name: "Bia Santos", ini: "BS", role: "operator", area: "sound", title: "Sonoplastia / projeção" },
    joao: { name: "João Melo", ini: "JM", role: "editor", area: "comms", title: "Comunicação" },
    pr: { name: "Pr. Carlos Dias", ini: "CD", role: "editor", area: "pulpit", title: "Pastor" },
    rute: { name: "Rute Alves", ini: "RA", role: "reader", area: null, title: "Diaconato" },
    tiago: { name: "Tiago Neves", ini: "TN", role: "reader", area: null, title: "Pregador convidado" },
  };

  const roles = {
    admin: { name: "Administrador", can: "Tudo: modelos, programas, execução, relatórios, papéis" },
    operator: { name: "Operador", can: "Executa o programa ao vivo" },
    editor: { name: "Editor de área", can: "Edita os itens da sua área antes do culto" },
    reader: { name: "Leitor", can: "Vê programa e relatório" },
  };
  const areas = { music: "Música", sound: "Sonoplastia", comms: "Comunicação", pulpit: "Púlpito" };

  const types = {
    song: { name: "Música", advance: "manual", note: "Slides da letra; avanço por toque ou pelo tempo da música" },
    notice: { name: "Aviso", advance: "auto", note: "Mostra o slide pelo tempo previsto" },
    wait: { name: "Espera", advance: "auto", note: "Contagem regressiva; avança ao zerar" },
    prayer: { name: "Oração / leitura", advance: "manual", note: "Aguarda o comando" },
    sermon: { name: "Sermão", advance: "manual", note: "Cronômetro corre, nunca avança sozinho" },
    video: { name: "Vídeo", advance: "auto", note: "Avança ao terminar" },
    media: { name: "Vídeo / áudio", advance: "auto", note: "Link do YouTube, Vimeo, Spotify ou arquivo; entra sozinho e toca do jeito que é, sem fonte nem estilo" },
    pause: { name: "Pausa livre", advance: "manual", note: "Tela neutra até o comando" },
  };

  // Músicas = decks do XLIDE com kind 'song'. Estrofes separadas por linha em branco.
  const songs = {
    s1: {
      title: "Luz da manhã", author: "Ministério Mosaico", key: "G", bpm: 72, uses: 9, last: "15/11",
      langs: ["pt", "en"], source: "YouTube · letra sincronizada",
      lyrics: {
        pt: "[Verso]\nA luz da manhã chegou\nE o medo foi embora\n\n[Verso]\nTeu nome é meu lugar\nMinha casa, minha aurora\n\n[Refrão]\nCantamos juntos, muitos sotaques\nUma só voz a te louvar\n\n[Refrão]\nCantamos juntos, muitos sotaques\nUma só casa, um só altar",
        en: "[Verse]\nThe morning light has come\nAnd fear has gone away\n\n[Verse]\nYour name is where I stay\nMy home, my break of day\n\n[Chorus]\nWe sing together, many accents\nOne single voice to praise\n\n[Chorus]\nWe sing together, many accents\nOne single house, one place",
      },
    },
    s2: {
      title: "Caminho aberto", author: "Coral Nova Semente", key: "D", bpm: 84, uses: 4, last: "08/11",
      langs: ["pt"], source: "Colado à mão",
      lyrics: { pt: "[Verso]\nHá um caminho aberto\nNo meio do deserto\n\n[Refrão]\nVou junto, vou contigo\nTua mão é meu abrigo\n\n[Ponte]\nMesmo quando a noite vem\nTu estás aqui também" },
    },
    s3: {
      title: "Mesa grande", author: "Jovens Rotterdam", key: "A", bpm: 96, uses: 2, last: "25/10",
      langs: ["pt", "nl"], source: "LRC importado",
      lyrics: { pt: "[Verso]\nTem lugar na mesa grande\nPra quem chega agora\n\n[Refrão]\nChega mais, faz parte\nNinguém fica de fora", nl: "[Couplet]\nEr is plek aan de grote tafel\nVoor wie nu binnenkomt\n\n[Refrein]\nKom erbij, hoor erbij\nNiemand blijft buiten" },
    },
    s4: {
      title: "Santo é o teu nome", author: "Hinário (domínio público, adaptado)", key: "Eb", bpm: 66, uses: 14, last: "22/11",
      langs: ["pt"], source: "Hinário",
      lyrics: { pt: "[Verso]\nSanto, santo é o teu nome\nTerra e céu a proclamar\n\n[Refrão]\nGlória, glória para sempre\nVamos todos adorar" },
    },
  };

  // Decks do XLIDE usados como conteúdo de itens (avisos, sermão…)
  const decks = {
    d1: { title: "Avisos · semana 48", kind: "deck", slides: 4, layout: "statement", updated: "ontem, João" },
    d2: { title: "Série: Casa de muitos — parte 3", kind: "deck", slides: 11, layout: "chapter", updated: "terça, Pr. Carlos" },
    d3: { title: "Boas-vindas convidados", kind: "deck", slides: 2, layout: "cover", updated: "out, Ana" },
    d4: { title: "Batismo 13/12 · convite", kind: "deck", slides: 1, layout: "image", updated: "hoje, João" },
  };

  const lines = (txt) =>
    txt.split(/\n\s*\n/).map((block) => {
      const rows = block.trim().split("\n");
      const m = rows[0].match(/^\[(.+)\]$/);
      return { section: m ? m[1] : "", text: (m ? rows.slice(1) : rows).join("\n") };
    });
  const songSlides = (id, lang = "pt") => {
    const s = songs[id];
    if (!s) return [{ section: "", text: "" }];
    return lines(s.lyrics[lang] || s.lyrics.pt || Object.values(s.lyrics)[0] || "");
  };

  // Programa do sábado (live_program_items). planned em segundos.
  const program = {
    id: "p_2911", title: "Culto principal", date: "Sábado, 29 de novembro", starts: "10:00", targetMin: 95,
    state: "ready", serviceType: "culto-principal",
    items: [
      { type: "wait", title: "Contagem para o início", planned: 300, owner: "bia", area: "sound", advance: "auto", public: true, text: "O culto começa em instantes" },
      { type: "prayer", title: "Boas-vindas e oração", planned: 180, owner: "ana", area: "pulpit", advance: "manual", public: true, deck: "d3" },
      { type: "song", title: "Luz da manhã", song: "s1", planned: 300, owner: "lucas", area: "music", advance: "manual", public: true },
      { type: "song", title: "Mesa grande", song: "s3", planned: 270, owner: "lucas", area: "music", advance: "manual", public: true },
      { type: "notice", title: "Avisos da semana", planned: 240, owner: "joao", area: "comms", advance: "auto", public: true, deck: "d1", text: "Batismo dia 13/12 · Ensaio do coral quinta 19h30 · Almoço fraterno após o culto" },
      { type: "video", title: "Vídeo: missão Rotterdam", planned: 150, owner: "joao", area: "comms", advance: "auto", public: true },
      { type: "prayer", title: "Momento de oração", planned: 300, owner: "rute", area: "pulpit", advance: "manual", public: true },
      { type: "song", title: "Caminho aberto", song: "s2", planned: 240, owner: "lucas", area: "music", advance: "manual", public: true },
      { type: "notice", title: "Dízimos e ofertas", planned: 240, owner: "joao", area: "comms", advance: "auto", public: true, text: "Sua oferta sustenta a missão nesta cidade" },
      { type: "sermon", title: "Casa de muitos", planned: 2400, owner: "pr", area: "pulpit", advance: "manual", public: true, deck: "d2", text: "Efésios 2:19" },
      { type: "song", title: "Santo é o teu nome", song: "s4", planned: 240, owner: "lucas", area: "music", advance: "manual", public: true },
      { type: "prayer", title: "Bênção final", planned: 120, owner: "pr", area: "pulpit", advance: "manual", public: true },
      { type: "pause", title: "Encerramento · música ambiente", planned: 300, owner: "bia", area: "sound", advance: "manual", public: false },
    ],
  };

  // Execuções anteriores (relatório) — real em segundos por posição.
  const history = [
    { date: "22/11", planned: 5700, real: 6240 },
    { date: "15/11", planned: 5700, real: 6020 },
    { date: "08/11", planned: 5640, real: 5880 },
    { date: "01/11", planned: 5640, real: 6300 },
  ];
  const lastRun = [290, 260, 420, 300, 330, 150, 380, 250, 230, 2760, 260, 140, 300];

  const templates = [
    { id: "t1", name: "Culto principal", items: 13, minutes: 95, uses: 34 },
    { id: "t2", name: "Culto jovem", items: 9, minutes: 75, uses: 12 },
    { id: "t3", name: "Culto infantil", items: 8, minutes: 50, uses: 6 },
  ];


  // Moodboards do XLIDE (boards: mapa + moodboard + kanban). No app real: xlide_boards.
  const boards = {
    b1: { title: "Nova Semente · identidade", items: 42, updated: "hoje", by: "ana", when: "25/11", loops: ["CQ0keZI1gds", "ciD38DyxEC4", "5djr6ofyLLY"], colors: ["#e9e4d8", "#1f4bd8", "#161615"] },
    b2: { title: "Série Casa de muitos", items: 18, updated: "terça", by: "pr", when: "24/11", loops: ["oCZtyFfds-o", "DCBMIg4Yoq8", "1krnHdrN6q0"], colors: ["#f5c26b", "#3b2a12", "#f7f6f3"] },
    b3: { title: "Natal 2026 · culto especial", items: 27, updated: "ontem", by: "joao", when: "24/11", loops: ["w4BuwIA-vg0", "jT9IykfTWy0", "ciD38DyxEC4"], colors: ["#8a2a22", "#f5c26b", "#121211"] },
    b4: { title: "Batismo 13/12", items: 9, updated: "semana passada", by: "joao", when: "18/11", loops: ["CQ0keZI1gds", "1krnHdrN6q0", "w4BuwIA-vg0"], colors: ["#9fd8ff", "#0077b6", "#f7f6f3"] },
  };

  // ids dos itens (live_program_items.id) e tempo das músicas (Slide.at do XLIDE)
  program.items.forEach((it, i) => (it.id = "i" + (i + 1)));
  /* Programa Estúdio: todos os programas (rascunho, salvo, já feito, arquivado, lixeira).
     O programa "no ao vivo" substitui XL.program em todas as páginas (console, tela, página pública).
     No app real: live_programs (status) + live_program_items; duplicar copia os itens. */
  const PKEY = "xlide.v2.programs";
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const base = clone(program.items);
  const pick = (titles) => base.filter((it) => titles.some((t) => it.title.startsWith(t)));
  const seed = () => ({ live: "p_2911", list: [
    { id: "p_2911", title: "Culto principal", date: "Sábado, 29 de novembro", short: "29/11", starts: "10:00", targetMin: 95, status: "rascunho", updated: "hoje", by: "ana", items: clone(base), archived: [], trash: [] },
    { id: "p_0612", title: "Culto principal", date: "Sábado, 6 de dezembro", short: "06/12", starts: "10:00", targetMin: 95, status: "rascunho", updated: "ontem", by: "ana", items: clone(base).slice(0, 9), archived: [], trash: [] },
    { id: "p_0612j", title: "Culto jovem", date: "Sábado, 6 de dezembro", short: "06/12", starts: "16:00", targetMin: 75, status: "rascunho", updated: "terça", by: "joao", items: pick(["Contagem", "Boas-vindas", "Luz", "Caminho", "Vídeo", "Momento", "Casa", "Bênção"]), archived: [], trash: [] },
    { id: "p_1312", title: "Culto principal, batismo", date: "Sábado, 13 de dezembro", short: "13/12", starts: "10:00", targetMin: 120, status: "salvo", updated: "20/11", by: "pr", items: clone(base), archived: [], trash: [] },
    { id: "p_2211", title: "Culto principal", date: "Sábado, 22 de novembro", short: "22/11", starts: "10:00", targetMin: 95, status: "feito", updated: "22/11", by: "ana", real: "+9 min", items: clone(base), archived: [], trash: [] },
    { id: "p_1511", title: "Culto principal", date: "Sábado, 15 de novembro", short: "15/11", starts: "10:00", targetMin: 95, status: "feito", updated: "15/11", by: "ana", real: "+5 min", items: clone(base), archived: [], trash: [] },
    { id: "p_0811", title: "Culto jovem", date: "Sábado, 8 de novembro", short: "08/11", starts: "16:00", targetMin: 75, status: "feito", updated: "08/11", by: "joao", real: "+4 min", items: pick(["Contagem", "Luz", "Mesa", "Casa", "Bênção"]), archived: [], trash: [] },
    { id: "p_2510", title: "Retiro de outono · noite", date: "Sábado, 25 de outubro", short: "25/10", starts: "19:30", targetMin: 60, status: "arquivado", updated: "out", by: "ana", items: pick(["Contagem", "Momento", "Santo", "Bênção"]), archived: [], trash: [] },
  ] });
  // com o Supabase ligado não há programas de exemplo: a lista vem do banco (cloud.js)
  const CL = window.XCLOUD && XCLOUD.on && !XCLOUD.leaving ? XCLOUD : null;
  const empty = () => ({ live: null, list: [] });
  let pstore = (() => { try { const x = JSON.parse(localStorage.getItem(PKEY)); return x && x.list ? x : CL ? empty() : seed(); } catch { return CL ? empty() : seed(); } })();
  const PROGS = {
    STATUS: [["rascunho", "Rascunhos", "Ainda mudando"], ["salvo", "Salvos", "Prontos para o sábado"], ["feito", "Já feitos", "Cultos que já aconteceram"], ["arquivado", "Arquivados", "Guardados, fora da lista"], ["lixeira", "Lixeira", "Excluídos; somem em 30 dias"]],
    all: () => pstore.list,
    get: (id) => pstore.list.find((x) => x.id === id),
    get liveId() { return pstore.live; },
    setLive(id) { pstore.live = id; this.save(); },
    save() { try { localStorage.setItem(PKEY, JSON.stringify(pstore)); } catch {} },
    put(p) { const i = pstore.list.findIndex((x) => x.id === p.id); if (i >= 0) pstore.list[i] = p; else pstore.list.unshift(p); this.save(); return p; },
    duplicate(id, patch = {}) { const o = this.get(id); const n = { ...clone(o), id: "p_" + Date.now().toString(36), title: o.title + " (cópia)", status: "rascunho", updated: "agora", by: (typeof localStorage !== "undefined" && localStorage.getItem("xlide.v2.me")) || "ana", real: null, ...patch }; n.items.forEach((it, k) => (it.id = "d" + k + Date.now().toString(36))); return this.put(n); },
    destroy(id) { pstore.list = pstore.list.filter((x) => x.id !== id); this.save(); },
    reset() { pstore = CL ? empty() : seed(); this.save(); },
    clone,
  };

  const durs = { s1: 262, s2: 214, s3: 198, s4: 236 };
  Object.entries(songs).forEach(([k, s]) => {
    s.dur = durs[k];
    const n = lines(s.lyrics.pt).length;
    const intro = 12, outro = 14;
    s.at = Array.from({ length: n }, (_, i) => Math.round(intro + ((s.dur - intro - outro) / n) * i));
  });


  /* Meus arquivos: o que cada pessoa criou, por pasta. status: ativo | padrao | arquivado | lixeira.
     No app real: xlide_decks com folder_id, status e shared_with (RLS por dono e compartilhados). */
  const F = (id, name, folder, o) => ({ id, name, folder, kind: "deck", status: "ativo", star: false, shared: [], slides: 1, font: "grotesk", ...o });
  const files = [
    F("f1", "Avisos · semana 48", "avisos", { owner: "ana", shared: ["joao", "bia"], slides: 4, updated: "ontem", bg: "wash:amber", eyebrow: "Avisos", title: "Avisos da semana", text: "Batismo dia 13/12\nEnsaio do coral quinta 19h30", star: true, desc: "Vai no programa de sábado, item 5. João revisa as datas." }),
    F("f2", "Batismo 13/12 · convite", "avisos", { owner: "joao", shared: ["ana"], slides: 1, updated: "hoje", bg: "plain:sabado", eyebrow: "Sábado 13/12 · 10:00", title: "Batismo", text: "Inscrições com o Pr. Carlos até 06/12", desc: "Convite para o telão e para o Instagram." }),
    F("f3", "Retiro jovem 2027", "avisos", { owner: "ana", shared: [], slides: 2, updated: "22/11", bg: "plain:papel", eyebrow: "Inscrições abertas", title: "Retiro jovem 2027", text: "15 a 17 de janeiro · Ede", desc: "Rascunho. Falta o valor da inscrição." }),
    F("f4", "Avisos · semana 47", "avisos", { owner: "ana", shared: ["joao"], slides: 3, updated: "15/11", bg: "wash:ember", eyebrow: "Avisos", title: "Avisos da semana 47", status: "arquivado" }),
    F("f5", "Casa de muitos · parte 3", "pregacao", { owner: "pr", shared: ["ana", "bia"], slides: 11, updated: "terça", bg: "wash:gold", font: "serif", eyebrow: "Série · parte 3", title: "Casa de muitos", text: "Lucas 14:15–24", star: true, desc: "Sermão de sábado, 40 min. Slides de apoio a cada ponto." }),
    F("f6", "Advento · a espera", "pregacao", { owner: "pr", shared: ["ana"], slides: 6, updated: "20/11", bg: "wash:midnight", font: "serif", eyebrow: "Série de dezembro", title: "A espera", text: "Isaías 40:31", desc: "Primeiro sermão de dezembro. Em construção." }),
    F("f7", "Casa de muitos · parte 2", "pregacao", { owner: "pr", shared: ["ana"], slides: 9, updated: "15/11", bg: "wash:gold", font: "serif", eyebrow: "Série · parte 2", title: "Casa de muitos", text: "Lucas 15:1–7", status: "arquivado" }),
    F("f8", "Boas-vindas convidados", "inicio", { owner: "ana", shared: ["bia"], slides: 2, updated: "out", bg: "loop:CQ0keZI1gds", eyebrow: "Bem-vindo", title: "Boas-vindas", text: "Que bom ter você aqui hoje", desc: "Abre o culto depois da contagem." }),
    F("f9", "Contagem 5 min", "inicio", { owner: "bia", shared: ["ana"], slides: 1, updated: "08/11", bg: "loop:5djr6ofyLLY", eyebrow: "Começamos em instantes", title: "05:00", text: "" }),
    F("f10", "Momento de oração", "oracao", { owner: "ana", shared: ["rute", "bia"], slides: 1, updated: "18/11", bg: "loop:DCBMIg4Yoq8", eyebrow: "Oração", title: "Vamos orar", text: "Pelos pedidos da semana", desc: "Fundo calmo, sem letra." }),
    F("f11", "Pedidos da semana", "oracao", { owner: "rute", shared: ["ana"], slides: 2, updated: "hoje", bg: "plain:tinta", eyebrow: "Pedidos", title: "Oramos por", text: "Família Melo\nIrmã Lúcia, cirurgia\nNovos empregos" }),
    F("f12", "Salmo 23", "versiculo", { owner: "pr", shared: ["ana", "bia"], slides: 3, updated: "12/11", bg: "wash:mist", font: "serif", eyebrow: "Salmo 23:1", title: "O Senhor é o meu pastor", text: "nada me faltará", star: true }),
    F("f13", "Lucas 14:15–24", "versiculo", { owner: "pr", shared: ["ana"], slides: 2, updated: "terça", bg: "wash:dusk", font: "serif", eyebrow: "Leitura", title: "Lucas 14:23", text: "Vai pelos caminhos e convida" }),
    F("f14", "João 3:16", "versiculo", { owner: "ana", shared: [], slides: 1, updated: "02/11", bg: "wash:crimson", font: "serif", eyebrow: "João 3:16", title: "Porque Deus amou o mundo", text: "", status: "lixeira", deleted: "há 3 dias" }),
    F("f15", "Modelo · aviso", "avisos", { owner: "ana", shared: ["joao"], slides: 1, updated: "set", bg: "plain:papel", eyebrow: "Data · hora", title: "Título do aviso", text: "Uma linha com o detalhe", status: "padrao", desc: "Ponto de partida para todo aviso. Fundo claro, texto à esquerda." }),
    F("f16", "Modelo · sermão", "pregacao", { owner: "ana", shared: ["pr"], slides: 4, updated: "set", bg: "wash:gold", font: "serif", eyebrow: "Série", title: "Título do sermão", text: "Texto base", status: "padrao" }),
    F("f17", "Modelo · versículo", "versiculo", { owner: "ana", shared: ["pr"], slides: 1, updated: "set", bg: "wash:dusk", font: "serif", eyebrow: "Livro 0:0", title: "O versículo em uma linha", text: "", status: "padrao" }),
    F("f18", "Ensaio coral · cartaz", "avisos", { owner: "joao", shared: [], slides: 1, updated: "10/11", bg: "plain:grade", eyebrow: "Quinta", title: "Ensaio do coral", text: "19h30", status: "lixeira", deleted: "há 6 dias" }),
  ];

  // o programa no ao vivo vira o XL.program de todas as páginas
  const liveP = PROGS.get(pstore.live);
  if (liveP) Object.assign(program, { id: liveP.id, title: liveP.title, date: liveP.date, starts: liveP.starts, targetMin: liveP.targetMin, items: clone(liveP.items) });
  window.PROGS = PROGS;
  const XLd = { files, boards, people, roles, areas, types, songs, decks, program, history, lastRun, templates, songSlides, me: "bia" };

  /* Supabase ligado: os dados de exemplo saem e entram os reais (cópia em cloud.js). */
  if (CL) {
    const C = CL.cache || {};
    const swap = (o, n) => { Object.keys(o).forEach((k) => delete o[k]); Object.assign(o, n || {}); };
    // chaves de exemplo que as telas citam direto (XL.boards.b1, XL.people.ana…) caem no primeiro real ou num vazio
    const skip = new Set(["then", "toJSON", "length", "nodeType", "$$typeof"]);
    const soft = (obj, blank, first) => new Proxy(obj, { get(t, k) { if (k in t || typeof k !== "string" || skip.has(k) || k in Object.prototype) return t[k]; return (first && Object.values(t)[0]) || blank(k); } });
    swap(songs, C.songs); swap(decks, C.decks);
    if (C.public) {
      swap(people, {});
    } else {
      swap(people, C.people); swap(boards, C.boards);
      files.length = 0; (C.files || []).forEach((f) => files.push(f));
    }
    const liveC = C.public ? C.program : PROGS.get(pstore.live);
    const blankItem = { id: "none", type: "pause", title: "Nenhum programa no ao vivo", planned: 300, advance: "manual", public: true, text: "Escolha um programa em Programa → Usar no ao vivo" };
    Object.assign(program, liveC ? { id: liveC.id, title: liveC.title, date: liveC.date, starts: liveC.starts || "10:00", targetMin: liveC.targetMin, items: clone(liveC.items || []) } : { id: null, title: "Sem programa no ao vivo", date: "", starts: "10:00", targetMin: 5, items: [] });
    if (!program.items.length) program.items = [blankItem];
    // relatório: só cultos que rodaram aqui (tempo real gravado no fim do culto)
    const done = PROGS.all().filter((p) => p.runLog && p.runLog.real != null).sort((a, b) => (b.runLog.at || 0) - (a.runLog.at || 0));
    history.length = 0; done.slice(0, 8).forEach((p) => history.push({ date: p.short, planned: p.runLog.planned, real: p.runLog.real }));
    lastRun.length = 0; ((done[0] && done[0].runLog.durs) || []).forEach((d) => lastRun.push(d || 0));
    XLd.me = CL.uid || "me";
    XLd.people = soft(people, (k) => ({ name: "—", ini: "?", role: "reader", area: null, title: "" }));
    XLd.boards = soft(boards, (k) => ({ title: "Nenhum board ainda", items: 0, updated: "", by: XLd.me, when: "", loops: [], thumbs: [], colors: ["#e9e4d8", "#161615", "#f7f6f3"] }), true);
    XLd.songs = soft(songs, () => ({ title: "Música não encontrada", author: "", key: "—", bpm: "", uses: 0, last: "", langs: ["pt"], source: "", lyrics: { pt: "" }, dur: 0, at: [] }));
    XLd.decks = soft(decks, () => ({ title: "Deck não encontrado", kind: "deck", slides: 1, layout: "cover", updated: "" }));
    // músicas reais trazem os tempos dos slides (Slide.at) e a duração
  }
  window.XL = XLd;
})();
