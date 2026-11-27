/* XLIDE v2 · idiomas da interface: pt-BR (base), en, nl.
   Traduz os textos da interface na página inteira (inclusive o que é desenhado depois, por MutationObserver),
   pelo texto exato em português. Não mexe no conteúdo dos slides (letras, avisos), nos campos digitados
   nem no que está em [data-noi18n]. No app real: src/lib/i18n.ts com as mesmas chaves.
   Para cobrir um texto novo: acrescente a linha "Texto em português": ["English", "Nederlands"]. */
(function () {
  const D = {
    // navegação
    "Início": ["Home", "Start"], "Arquivos": ["Files", "Bestanden"], "Pastas": ["Folders", "Mappen"], "Meus arquivos": ["My files", "Mijn bestanden"],
    "Slides": ["Slides", "Dia's"], "Estúdio": ["Studio", "Studio"], "Culto": ["Service", "Dienst"], "Ideias": ["Ideas", "Ideeën"], "Igreja": ["Church", "Kerk"],
    "Músicas": ["Songs", "Liederen"], "Decks": ["Decks", "Decks"], "Fundos de avisos": ["Announcement backgrounds", "Mededelingsachtergronden"], "Modelos": ["Templates", "Sjablonen"],
    "Fundos e fontes": ["Backgrounds & fonts", "Achtergronden & lettertypes"], "Testar um slide": ["Try a slide", "Dia uitproberen"], "Editor de música": ["Song editor", "Liededitor"],
    "Agenda": ["Calendar", "Agenda"], "Programa": ["Run sheet", "Programma"], "Ao vivo": ["Live", "Live"], "Tela do projetor": ["Projector screen", "Beamerscherm"], "Relatório": ["Report", "Rapport"],
    "Boards": ["Boards", "Borden"], "Brand kits": ["Brand kits", "Merkkits"], "Equipe e acesso": ["Team & access", "Team & toegang"], "Configurações": ["Settings", "Instellingen"], "Criar": ["Create", "Maken"], "Menu": ["Menu", "Menu"],
    "Avisos": ["Announcements", "Mededelingen"], "Pregação": ["Sermons", "Preken"], "Início do culto": ["Service opening", "Begin dienst"], "Oração": ["Prayer", "Gebed"], "Versículos": ["Verses", "Verzen"],
    "Padrão": ["Defaults", "Standaard"], "Arquivados": ["Archived", "Gearchiveerd"], "Lixeira": ["Trash", "Prullenbak"], "Tudo": ["All", "Alles"], "Todos": ["All", "Alle"],
    "Rascunhos": ["Drafts", "Concepten"], "Salvos": ["Saved", "Opgeslagen"], "Já feitos": ["Done", "Gehouden"],
    // ações
    "Salvar": ["Save", "Opslaan"], "Salvar rascunho": ["Save draft", "Concept opslaan"], "Cancelar": ["Cancel", "Annuleren"], "Fechar": ["Close", "Sluiten"], "Abrir": ["Open", "Openen"],
    "Editar": ["Edit", "Bewerken"], "Duplicar": ["Duplicate", "Dupliceren"], "Arquivar": ["Archive", "Archiveren"], "Desarquivar": ["Unarchive", "Dearchiveren"], "Excluir": ["Delete", "Verwijderen"],
    "Restaurar": ["Restore", "Herstellen"], "Excluir para sempre": ["Delete forever", "Definitief verwijderen"], "Excluir de vez": ["Delete forever", "Definitief verwijderen"], "Esvaziar lixeira": ["Empty trash", "Prullenbak legen"],
    "Desfazer": ["Undo", "Ongedaan maken"], "Confirmar": ["Confirm", "Bevestigen"], "Aplicar": ["Apply", "Toepassen"], "Descartar": ["Discard", "Verwerpen"], "Voltar": ["Back", "Terug"],
    "Novo": ["New", "Nieuw"], "Novo programa": ["New run sheet", "Nieuw programma"], "Novo deck": ["New deck", "Nieuw deck"], "Novo moodboard": ["New moodboard", "Nieuw moodboard"],
    "Favoritar": ["Favourite", "Favoriet"], "Tirar estrela": ["Unfavourite", "Geen favoriet"], "Tornar padrão": ["Make default", "Standaard maken"], "Tirar do padrão": ["Remove default", "Geen standaard"],
    "Usar modelo": ["Use template", "Sjabloon gebruiken"], "Continuar": ["Continue", "Verder"], "Ver tudo": ["See all", "Alles zien"], "Buscar": ["Search", "Zoeken"], "Apresentar": ["Present", "Presenteren"],
    "Adicionar": ["Add", "Toevoegen"], "+ Adicionar": ["+ Add", "+ Toevoegen"], "Selecionar": ["Select", "Kiezen"], "Selecionada": ["Selected", "Gekozen"], "Em seguida": ["Up next", "Hierna"], "Na fila": ["Queued", "In wachtrij"],
    "Ouvir": ["Listen", "Luisteren"], "Parar": ["Stop", "Stoppen"], "Mudo": ["Mute", "Dempen"], "Som": ["Sound", "Geluid"], "Expandir": ["Expand", "Uitklappen"], "Recolher": ["Collapse", "Inklappen"],
    "Trocar": ["Switch", "Wisselen"], "Pausar": ["Pause", "Pauze"], "Retomar": ["Resume", "Hervatten"], "Começar": ["Start", "Beginnen"], "Tocar": ["Play", "Afspelen"], "Tocando": ["Playing", "Speelt"],
    "Tocar trilha": ["Play track", "Muziek afspelen"], "Iniciar trilha": ["Start track", "Muziek starten"], "Pausar trilha": ["Pause track", "Muziek pauzeren"], "Trocar com fade": ["Crossfade", "Overvloeien"],
    "Pôr em foco": ["Focus", "Focussen"], "Em foco": ["In focus", "In focus"], "Clique de novo para trocar": ["Click again to switch", "Klik nogmaals om te wisselen"],
    "Novo programa": ["New run sheet", "Nieuw programma"], "Usar no ao vivo": ["Use live", "Live gebruiken"], "No ao vivo": ["Live now", "Nu live"],
    "Adicionar item": ["Add item", "Item toevoegen"], "+ Adicionar item": ["+ Add item", "+ Item toevoegen"], "Copiar de outro programa": ["Copy from another run sheet", "Kopiëren van ander programma"],
    "Mover para a lixeira do programa": ["Move to run sheet trash", "Naar prullenbak van programma"], "Abrir no editor (tela cheia)": ["Open in editor (full screen)", "Openen in editor (volledig scherm)"],
    "Expandir e editar o layout": ["Expand and edit layout", "Uitklappen en lay-out bewerken"], "Imagem": ["Image", "Afbeelding"], "+ Trilha": ["+ Track", "+ Muziek"], "Off": ["Off", "Uit"],
    // painéis e campos
    "Fundo": ["Background", "Achtergrond"], "Fonte": ["Font", "Lettertype"], "Layout": ["Layout", "Lay-out"], "Texto": ["Text", "Tekst"], "Trilha": ["Track", "Muziek"], "Atalhos": ["Shortcuts", "Sneltoetsen"],
    "Título": ["Title", "Titel"], "Rótulo": ["Label", "Label"], "Timer": ["Timer", "Timer"], "Volume": ["Volume", "Volume"], "Tamanho": ["Size", "Grootte"], "Largura": ["Width", "Breedte"],
    "Este slide": ["This slide", "Deze dia"], "Todos os slides": ["All slides", "Alle dia's"], "Cores": ["Colours", "Kleuren"], "Vídeos": ["Videos", "Video's"], "Imagens": ["Images", "Afbeeldingen"],
    "Em loop": ["Loop", "Herhalen"], "Uma vez": ["Once", "Eén keer"], "Reprodução": ["Playback", "Afspelen"], "Importar imagem": ["Import image", "Afbeelding importeren"],
    "Título na tela": ["On-screen title", "Titel op scherm"], "Tipo": ["Type", "Type"], "Responsável": ["Owner", "Verantwoordelijke"], "Avançar sozinho": ["Auto-advance", "Automatisch verder"],
    "Público": ["Public", "Openbaar"], "Hora": ["Time", "Tijd"], "Item": ["Item", "Item"], "Tempo": ["Duration", "Duur"], "Ações": ["Actions", "Acties"], "Prévia": ["Preview", "Voorbeeld"],
    "Centro": ["Centre", "Midden"], "Esquerda": ["Left", "Links"], "Direita": ["Right", "Rechts"], "Contagem grande": ["Big countdown", "Grote aftelling"], "Faixa embaixo": ["Lower third", "Onderbalk"],
    "Música": ["Song", "Lied"], "Aviso": ["Announcement", "Mededeling"], "Espera": ["Countdown", "Aftellen"], "Oração / leitura": ["Prayer / reading", "Gebed / lezing"], "Sermão": ["Sermon", "Preek"],
    "Vídeo": ["Video", "Video"], "Pausa livre": ["Free pause", "Vrije pauze"], "Deck": ["Deck", "Deck"],
    "Trilha de fundo": ["Background music", "Achtergrondmuziek"], "Trilha de fundo nesta tela": ["Background music on this screen", "Achtergrondmuziek op dit scherm"], "Trilha sonora": ["Soundtrack", "Soundtrack"],
    "Todas as faixas": ["All tracks", "Alle nummers"], "Buscar faixa": ["Search track", "Nummer zoeken"], "Sem trilha": ["No track", "Geen muziek"], "Segue as telas": ["Follows screens", "Volgt schermen"],
    "Transição entre telas": ["Screen transition", "Schermovergang"], "Transição": ["Transition", "Overgang"], "Transição · padrão": ["Transition · default", "Overgang · standaard"],
    "Corte seco": ["Cut", "Harde overgang"], "Fade": ["Fade", "Fade"], "Slide": ["Slide", "Schuif"], "Sobrepor": ["Overlay", "Overlap"],
    "Música em reprodução": ["Now playing", "Nu afgespeeld"], "Slides seguem a música": ["Slides follow the song", "Dia's volgen het lied"], "Avançar": ["Forward", "Vooruit"],
    // console e programa
    "Agora": ["Now", "Nu"], "Término": ["Ends", "Einde"], "Atraso": ["Delay", "Vertraging"], "Estender": ["Extend", "Verlengen"], "Na tela": ["On screen", "Op scherm"],
    "Ordem do culto": ["Order of service", "Liturgie"], "encerrar culto": ["end service", "dienst beëindigen"], "Pendências": ["To do", "Openstaand"], "Pós-culto": ["After service", "Na de dienst"],
    "Estado do programa": ["Run sheet status", "Programmastatus"], "Rascunho": ["Draft", "Concept"], "Pronto": ["Ready", "Klaar"], "Modelo": ["Template", "Sjabloon"], "Contingência": ["Fallback", "Noodplan"],
    "Programa Estúdio": ["Run sheet studio", "Programmastudio"], "Itens arquivados": ["Archived items", "Gearchiveerde items"], "Lixeira do programa": ["Run sheet trash", "Prullenbak van programma"],
    "Início": ["Home", "Start"], "Total / alvo": ["Total / target", "Totaal / doel"], "Todas": ["All", "Alle"], "Sonoplastia": ["Sound", "Geluid"], "Comunicação": ["Comms", "Communicatie"], "Púlpito": ["Pulpit", "Kansel"],
    "Antes do culto": ["Before service", "Voor de dienst"], "Pausado": ["Paused", "Gepauzeerd"], "Encerrado": ["Ended", "Afgelopen"], "Sincronizado": ["Synced", "Gesynchroniseerd"], "sincronizado": ["synced", "gesynchroniseerd"],
    // início
    "Visão geral": ["Overview", "Overzicht"], "Ver como": ["View as", "Bekijken als"], "Próximo culto": ["Next service", "Volgende dienst"], "Validação": ["Checks", "Controle"], "Começa em": ["Starts in", "Begint over"],
    "Continuar editando?": ["Keep editing?", "Verder bewerken?"], "Moodboard recente": ["Recent moodboard", "Recent moodboard"], "Último mapa mental": ["Latest mind map", "Laatste mindmap"], "Duração típica": ["Typical length", "Gemiddelde duur"],
    "Principal": ["Main", "Hoofddienst"], "Jovem": ["Youth", "Jeugd"], "Operador": ["Operator", "Operator"], "Admin": ["Admin", "Admin"],
    "Boa noite,": ["Good evening,", "Goedenavond,"], "Boa tarde,": ["Good afternoon,", "Goedemiddag,"], "Bom dia,": ["Good morning,", "Goedemorgen,"],
    // estúdio e arquivos
    "Testar": ["Try", "Uitproberen"], "Fundos": ["Backgrounds", "Achtergronden"], "Fontes": ["Fonts", "Lettertypes"], "Cores do texto": ["Text colours", "Tekstkleuren"], "Seus testes": ["Your tests", "Je tests"],
    "Cores em movimento": ["Moving colours", "Bewegende kleuren"], "Loops de vídeo": ["Video loops", "Videoloops"], "Recentes": ["Recent", "Recent"], "Nome": ["Name", "Naam"], "Favoritos primeiro": ["Favourites first", "Favorieten eerst"],
    "Prévia do arquivo": ["File preview", "Bestandsvoorbeeld"], "Pasta": ["Folder", "Map"], "Estado": ["Status", "Status"], "Atualizado": ["Updated", "Bijgewerkt"], "Dono": ["Owner", "Eigenaar"],
    "Descrição": ["Description", "Beschrijving"], "Compartilhado com": ["Shared with", "Gedeeld met"], "Mover para a pasta": ["Move to folder", "Naar map verplaatsen"], "Ativo": ["Active", "Actief"],
    "Buscar nos meus arquivos": ["Search my files", "Zoek in mijn bestanden"], "Trocar pessoa": ["Switch person", "Persoon wisselen"],
    // agenda
    "Escala do sábado": ["Saturday rota", "Rooster zaterdag"], "Tarefas": ["Tasks", "Taken"], "Hoje": ["Today", "Vandaag"], "Compartilhar": ["Share", "Delen"], "Cultos": ["Services", "Diensten"], "Ensaios": ["Rehearsals", "Repetities"], "Reuniões": ["Meetings", "Vergaderingen"],
    "Nada marcado ainda.": ["Nothing scheduled yet.", "Nog niets gepland."], "Horário": ["Time", "Tijd"], "Local": ["Place", "Locatie"], "Equipe": ["Team", "Team"],
    // miniatura e projetor
    "tela cheia (F)": ["full screen (F)", "volledig scherm (F)"], "Clique em qualquer lugar para tela cheia": ["Click anywhere for full screen", "Klik ergens voor volledig scherm"],
    "Clique num texto para editar. Clique de novo para escrever.": ["Click a text to edit. Click again to type.", "Klik op een tekst om te bewerken. Klik nogmaals om te typen."],

    // segunda leva: frases do console, início, arquivos, deck
    "Dê play para começar": ["Press play to start", "Druk op play om te beginnen"], "Duração total": ["Total length", "Totale duur"], "Depois deste item:": ["After this item:", "Na dit item:"],
    "Último item do culto.": ["Last item of the service.", "Laatste item van de dienst."], "Culto encerrado": ["Service ended", "Dienst afgelopen"], "Pronta para tocar": ["Ready to play", "Klaar om af te spelen"],
    "parada": ["stopped", "gestopt"], "carregando…": ["loading…", "laden…"], "Sem trilha": ["No track", "Geen muziek"], "sem trilha": ["no track", "geen muziek"], "Fim do programa": ["End of run sheet", "Einde programma"],
    "Esta tela:": ["This screen:", "Dit scherm:"], "sem trilha (off)": ["no track (off)", "geen muziek (uit)"], "Em espera · entra com fade": ["Waiting · fades in", "Wacht · faadt in"],
    "Trilha de fundo bloqueada": ["Background music locked", "Achtergrondmuziek geblokkeerd"], "Início": ["Home", "Start"], "Voltar 10 s": ["Back 10 s", "10 s terug"],
    "manual": ["manual", "handmatig"], "avança sozinho": ["auto-advances", "gaat vanzelf verder"], "Pendências": ["To do", "Openstaand"],
    "Agenda": ["Calendar", "Agenda"], "Arquivos": ["Files", "Bestanden"], "Semana do culto": ["Service week", "Dienstweek"], "Deck, música, board": ["Deck, song, board", "Deck, lied, bord"],
    "Revisar o programa": ["Review the run sheet", "Programma nakijken"], "Marcar como pronto": ["Mark as ready", "Als klaar markeren"], "Abrir o ao vivo": ["Open live", "Live openen"], "Você opera sábado": ["You run Saturday", "Jij bedient zaterdag"],
    "Sem arquivo de vídeo": ["No video file", "Geen videobestand"], "Letra só em português": ["Lyrics only in Portuguese", "Tekst alleen in het Portugees"], "Ainda em rascunho": ["Still a draft", "Nog een concept"], "Pilha fraca no último ensaio": ["Low battery at last rehearsal", "Batterij bijna leeg bij laatste repetitie"],
    "real": ["actual", "werkelijk"], "passou": ["over", "uitgelopen"], "Música · falta a tradução": ["Song · translation missing", "Lied · vertaling ontbreekt"],
    "Clique num bloco para selecionar e clique de novo para escrever ali mesmo. Arraste para mover; as alças das laterais mudam a largura e as dos cantos mudam o tamanho. Setas movem 1% (Shift, 5%), Delete oculta.": ["Click a block to select it, click again to type. Drag to move; side handles change width, corner handles change size. Arrows move 1% (Shift, 5%), Delete hides.", "Klik op een blok om te selecteren, nogmaals om te typen. Sleep om te verplaatsen; zijgrepen wijzigen de breedte, hoekgrepen de grootte. Pijlen 1% (Shift, 5%), Delete verbergt."],
    "Slide anterior e próximo": ["Previous and next slide", "Vorige en volgende dia"], "Novo slide com a mesma estrutura": ["New slide, same structure", "Nieuwe dia, zelfde opbouw"], "Duplicar o slide": ["Duplicate slide", "Dia dupliceren"],
    "slides": ["slides", "dia's"], "novo slide": ["new slide", "nieuwe dia"], "duplicar": ["duplicate", "dupliceren"], "apagar bloco ou slide": ["delete block or slide", "blok of dia verwijderen"], "escrever": ["type", "typen"], "salvar": ["save", "opslaan"], "atalhos": ["shortcuts", "sneltoetsen"],
    "Vídeo deste slide": ["This slide's video", "Video van deze dia"], "Tirar a imagem de fundo": ["Remove background image", "Achtergrondafbeelding verwijderen"], "Inserir imagem no slide": ["Insert image on slide", "Afbeelding op dia plaatsen"],
    "Aplicar este layout em todos os slides": ["Apply this layout to all slides", "Deze lay-out op alle dia's toepassen"], "Aplicar no próximo slide": ["Apply to next slide", "Op volgende dia toepassen"],
    "Fonte do deck": ["Deck font", "Lettertype van deck"], "Cor do texto do deck": ["Deck text colour", "Tekstkleur van deck"], "Trilha adicionada para esse slide": ["Track added to this slide", "Muziek toegevoegd aan deze dia"],
    "Trilha adicionada para esta tela": ["Track added to this screen", "Muziek toegevoegd aan dit scherm"], "Esta tela está sem trilha": ["This screen has no track", "Dit scherm heeft geen muziek"], "Este slide está sem trilha": ["This slide has no track", "Deze dia heeft geen muziek"],
    "Adicionar fonte (link do YouTube)": ["Add source (YouTube link)", "Bron toevoegen (YouTube-link)"], "Tirar · sem trilha": ["Remove · no track", "Weghalen · geen muziek"], "Tirar deste slide": ["Remove from this slide", "Weghalen van deze dia"],
    "Ordem": ["Order", "Volgorde"], "Rascunho:": ["Draft:", "Concept:"], "salvo hoje": ["saved today", "vandaag opgeslagen"], "salvo agora": ["saved now", "nu opgeslagen"], "● alterações não salvas": ["● unsaved changes", "● niet-opgeslagen wijzigingen"],
    "Arraste pela alça para mudar a ordem. Os horários se ajustam e mostram o horário anterior.": ["Drag by the handle to reorder. Times adjust and show the previous time.", "Sleep aan de greep om te herordenen. Tijden passen zich aan en tonen de vorige tijd."],
    "Rascunho: arraste os itens pela alça e os horários se ajustam. Só o administrador marca como pronto.": ["Draft: drag items by the handle and times adjust. Only the admin marks it ready.", "Concept: sleep items aan de greep en de tijden passen zich aan. Alleen de beheerder zet het op klaar."],
    "Pronto: ordem e itens travados. Editores ainda ajustam o conteúdo. Para mover itens, volte para Rascunho.": ["Ready: order and items locked. Editors can still adjust content. To move items, go back to Draft.", "Klaar: volgorde en items vergrendeld. Redacteuren passen de inhoud nog aan. Terug naar Concept om te verplaatsen."],
    "Criado do modelo em 18/11. Mudanças de estrutura aqui não alteram o modelo.": ["Created from the template on 18/11. Structure changes here don't change the template.", "Gemaakt van het sjabloon op 18/11. Wijzigingen hier veranderen het sjabloon niet."],
    "Roteiro em PDF": ["Run sheet PDF", "Programma als pdf"], "Slides offline (.zip)": ["Offline slides (.zip)", "Offline dia's (.zip)"],
    "Música": ["Song", "Lied"], "Oração / leitura": ["Prayer / reading", "Gebed / lezing"], "auto": ["auto", "auto"], "interno": ["internal", "intern"], "Ideia": ["Idea", "Idee"], "Convite": ["Invitation", "Uitnodiging"],
    "Este é o primeiro slide.": ["This is the first slide.", "Dit is de eerste dia."], "O deck precisa ter pelo menos um slide.": ["A deck needs at least one slide.", "Een deck heeft minstens één dia nodig."],
    "Agenda": ["Calendar", "Agenda"], "Tela": ["Screen", "Scherm"], "Abrir no editor de deck": ["Open in deck editor", "Openen in deck-editor"],
    "Próximo item": ["Next item", "Volgend item"], "Importar do YouTube": ["Import from YouTube", "Importeren van YouTube"], "Importar": ["Import", "Importeren"], "Importadas": ["Imported", "Geïmporteerd"], "Último slide": ["Last slide", "Laatste dia"], "Encerrar culto": ["End service", "Dienst beëindigen"],
    "Você tem certeza que quer encerrar o culto?": ["Are you sure you want to end the service?", "Weet je zeker dat je de dienst wilt beëindigen?"], "Sim, encerrar o culto": ["Yes, end the service", "Ja, dienst beëindigen"], "piloto automático": ["autopilot", "automatische piloot"], "On": ["On", "Aan"],
    "Vídeo / áudio": ["Video / audio", "Video / audio"], "Importar vídeo ou áudio por link": ["Import video or audio by link", "Video of audio importeren via link"], "Importar para o programa": ["Import into run sheet", "In programma importeren"],
    "Duração (min:seg)": ["Duration (min:sec)", "Duur (min:sec)"], "Posição": ["Position", "Positie"], "Ou um item vazio": ["Or an empty item", "Of een leeg item"], "no começo": ["at the start", "aan het begin"],
    "Vídeo ou áudio no slide": ["Video or audio on slide", "Video of audio op dia"], "Pôr neste slide": ["Put on this slide", "Op deze dia zetten"], "Em todos os slides": ["On all slides", "Op alle dia's"], "Tirar a mídia deste slide": ["Remove media from this slide", "Media van deze dia weghalen"], "Mídia": ["Media", "Media"], "A seguir": ["Up next", "Hierna"], "Depois": ["After", "Daarna"], "trilha do culto": ["service track", "dienstmuziek"],
  };
  /* frases com números ou nomes no meio */
  const P = [
    [/^(\d+) (coisa|coisas) para resolver antes de sábado$/, (m) => [`${m[1]} thing${m[1] === "1" ? "" : "s"} to sort before Saturday`, `${m[1]} ${m[1] === "1" ? "ding" : "dingen"} te regelen voor zaterdag`]],
    [/^Tudo pronto para sábado$/, () => ["All set for Saturday", "Alles klaar voor zaterdag"]],
    [/^(\d+) · (A seguir|Depois|Próximo item)$/, (m) => [`${m[1]} · ${{ "A seguir": "Up next", Depois: "After", "Próximo item": "Next item" }[m[2]]}`, `${m[1]} · ${{ "A seguir": "Hierna", Depois: "Daarna", "Próximo item": "Volgend item" }[m[2]]}`]],
    [/^Item (\d+) de (\d+) · (.+)$/, (m) => [`Item ${m[1]} of ${m[2]} · ${tr(m[3])}`, `Item ${m[1]} van ${m[2]} · ${tr(m[3])}`]],
    [/^Piloto automático( · ligado)?$/, (m) => [`Autopilot${m[1] ? " · on" : ""}`, `Automatische piloot${m[1] ? " · aan" : ""}`]],
    [/^Primeiro: (.+)$/, (m) => [`First: ${m[1]}`, `Eerst: ${m[1]}`]],
    [/^decorrido (.+)$/, (m) => [`elapsed ${m[1]}`, `verstreken ${m[1]}`]], [/^previsto (.+)$/, (m) => [`planned ${m[1]}`, `gepland ${m[1]}`]],
    [/^(\d+) (arquivo|arquivos)$/, (m) => [`${m[1]} file${m[1] === "1" ? "" : "s"}`, `${m[1]} ${m[1] === "1" ? "bestand" : "bestanden"}`]],
    [/^(\d+) (programa|programas)$/, (m) => [`${m[1]} run sheet${m[1] === "1" ? "" : "s"}`, `${m[1]} ${m[1] === "1" ? "programma" : "programma's"}`]],
    [/^(\d+) (itens|item)$/, (m) => [`${m[1]} item${m[1] === "1" ? "" : "s"}`, `${m[1]} item${m[1] === "1" ? "" : "s"}`]],
    [/^(\d+) (ativos)$/, (m) => [`${m[1]} active`, `${m[1]} actief`]],
    [/^(\d+) arquivos · (\d+) na lixeira$/, (m) => [`${m[1]} files · ${m[2]} in trash`, `${m[1]} bestanden · ${m[2]} in prullenbak`]],
    [/^Slide (\d+) de (\d+)$/, (m) => [`Slide ${m[1]} of ${m[2]}`, `Dia ${m[1]} van ${m[2]}`]],
    [/^(Sábado|Domingo|Segunda|Terça|Quarta|Quinta|Sexta), (\d+) de (\w+)$/, (m) => { const W = { Sábado: ["Saturday", "zaterdag"], Domingo: ["Sunday", "zondag"], Segunda: ["Monday", "maandag"], Terça: ["Tuesday", "dinsdag"], Quarta: ["Wednesday", "woensdag"], Quinta: ["Thursday", "donderdag"], Sexta: ["Friday", "vrijdag"] }[m[1]]; const M = { novembro: ["November", "november"], dezembro: ["December", "december"], outubro: ["October", "oktober"] }[m[3]] || [m[3], m[3]]; return [`${W[0]}, ${m[2]} ${M[0]}`, `${W[1]} ${m[2]} ${M[1]}`]; }],
  ];
  const LANGS = [["pt", "PT"], ["en", "EN"], ["nl", "NL"]];
  const IDX = { en: 0, nl: 1 };
  let lang = (() => { try { return localStorage.getItem("xlide.v2.lang") || "pt"; } catch { return "pt"; } })();
  const SKIP = ".slide, .tx-host, .pip-s, .tb, .tpl2, [contenteditable], [data-noi18n], script, style, textarea, .mk";
  const ATTRS = ["placeholder", "aria-label", "title"];
  function tr(pt) {
    if (lang === "pt") return pt;
    const k = pt.trim(); if (!k) return pt;
    const lead = (k.match(/^[♪+✓·↝•●⇩\s]+/) || [""])[0], core = k.slice(lead.length);
    let v = D[core];
    if (!v) for (const [re, fn] of P) { const m = core.match(re); if (m) { v = fn(m); break; } }
    if (!v) return pt;
    return pt.replace(k, lead + v[IDX[lang]]);
  }

  function textNode(n) {
    const p = n.parentElement; if (!p || p.closest(SKIP)) return;
    const cur = n.nodeValue; if (!cur || !cur.trim()) return;
    // guarda o original em português; se o texto mudou por fora, vira o novo original
    if (n._pt == null || (cur !== n._done && cur !== n._pt)) n._pt = cur;
    // um texto ambíguo pode trazer a tradução no próprio elemento: data-en / data-nl
    const own = lang !== "pt" && p.childNodes.length === 1 && p.dataset[lang];
    const out = own || tr(n._pt);
    if (out !== cur) { n._done = out; n.nodeValue = out; } else n._done = cur;
  }
  function attrs(el) {
    if (el.closest(SKIP)) return;
    ATTRS.forEach((a) => {
      const v = el.getAttribute(a); if (!v) return;
      el._pta = el._pta || {};
      if (el._pta[a] == null || (v !== el._pta[a + "!"] && v !== el._pta[a])) el._pta[a] = v;
      const out = tr(el._pta[a]); el._pta[a + "!"] = out; if (out !== v) el.setAttribute(a, out);
    });
  }
  function walk(root) {
    if (root.nodeType === 3) return textNode(root);
    if (root.nodeType !== 1) return;
    attrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = tw.nextNode())) n.nodeType === 3 ? textNode(n) : attrs(n);
  }
  let busy = false;
  const mo = new MutationObserver((ms) => {
    if (busy) return; busy = true;
    try { ms.forEach((m) => { if (m.type === "characterData") textNode(m.target); else if (m.type === "attributes") attrs(m.target); else m.addedNodes.forEach(walk); }); } finally { busy = false; }
  });
  function set(l) {
    lang = l; try { localStorage.setItem("xlide.v2.lang", l); const pr = JSON.parse(localStorage.getItem("xlide.prefs") || "{}"); pr.locale = l; localStorage.setItem("xlide.prefs", JSON.stringify(pr)); } catch {}
    document.documentElement.lang = l === "pt" ? "pt-BR" : l;
    walk(document.body); paint();
  }
  /* seletor PT / EN / NL: no menu lateral (embaixo) e no menu do celular */
  function paint() {
    document.querySelectorAll("[data-theme-sw]").forEach((b) => { b.innerHTML = isDark() ? SUN : MOON; b.setAttribute("aria-pressed", isDark()); });
    document.querySelectorAll(".lang-sw").forEach((w) => w.querySelectorAll("[data-l]").forEach((b) => { b.classList.toggle("on", b.dataset.l === lang); b.setAttribute("aria-pressed", b.dataset.l === lang); }));
  }
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const isDark = () => (document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
  const switcher = () => `<div class="lang-sw" data-noi18n role="group" aria-label="Idioma / Language / Taal">${LANGS.map(([k, n]) => `<button type="button" data-l="${k}">${n}</button>`).join("")}<button type="button" class="th-sw" data-theme-sw aria-label="Tema claro ou escuro" title="Tema claro / escuro"></button></div>`;
  function mount() {
    const sb = document.querySelector(".sbar .sb-me");
    if (sb && !document.querySelector(".sbar .lang-sw")) sb.insertAdjacentHTML("beforebegin", switcher());
    const mkb = document.querySelector(".mk");
    if (mkb && !mkb.querySelector(".lang-sw")) mkb.insertAdjacentHTML("beforeend", switcher());
    const sm = document.querySelector(".sheet .sb-menu");
    if (sm && !sm.parentElement.querySelector(".lang-sw")) sm.insertAdjacentHTML("beforebegin", switcher());
    paint();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".lang-sw [data-l]"); if (b) return set(b.dataset.l);
    if (e.target.closest("[data-theme-sw]")) { window.UI && UI.toggleTheme(); paint(); }
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", paint);
  function start() {
    mount();
    document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;
    walk(document.body);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    new MutationObserver(mount).observe(document.body, { childList: true });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => setTimeout(start, 0)) : setTimeout(start, 0);
  window.I18N = { D, set, t: tr, paint, mount, get lang() { return lang; } };
})();
