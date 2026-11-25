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
    return lines(s.lyrics[lang] || s.lyrics.pt);
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

  window.XL = { people, roles, areas, types, songs, decks, program, history, lastRun, templates, songSlides, me: "bia" };
})();
