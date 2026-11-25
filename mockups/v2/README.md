# XLIDE v2 · mockups Live Church

HTML estático, sem build, **mobile-first** (390 px primeiro), na identidade do XLIDE (monocromático, sem raio, BDO Grotesk + Fragment Mono). Plano técnico: [`docs/live-church/integracao.md`](../../docs/live-church/integracao.md).

## Rodar
```bash
./mockups/v2/serve.sh         # http://localhost:4322/mockups/v2/
./mockups/v2/serve.sh --lan   # para abrir no celular
```

## Testar o culto
Abra `console.html`, `tela.html` e `ao-vivo.html` em abas (ou aparelhos na mesma origem). Dê play no console: as três andam juntas. Na barra preta do topo, **×10 / ×60** acelera o relógio para ver o avanço automático; **reiniciar culto** volta ao início. O ícone de Wi-Fi do console simula a queda de internet.

## Identidade v2.1 (25/11)
Mesma base do XLIDE (`/identity`: tipografia primeiro, monocromático, linhas de 1 px, sem raio), somada às referências do Daniel:
- **Grade com contorno e letra gigante** (Zeroline) → cabeçalho do Início em três células com o asterisco do XLIDE no centro; cartões de recentes com data e tipo em mono.
- **Números grandes e linha preta** (calendário) → `.cal-row`: dia gigante à direita, a linha do próximo culto em preto, quadradinhos de estado por área.
- **Relógio e faixa "agora"** (app de tarefas) → `.big-clock` + `.now-strip`; a barra de baixo do celular é preta e a aba ativa inverte (sem cantos arredondados).
- **Linhas de controle com contorno** (Fontshare) → inspetor do Estúdio e `.make-grid`.
- **Navegação**: uma só em `shell.js` (`data-tab` no `<body>`). Celular: barra preta com Início, Boards, "+", Slides, Programa, Ao vivo. Desktop (≥ 900 px): trilho de 84 px com a marca no topo e o "+" no pé. O "+" abre a folha **Criar** (moodboard, deck, música, programa).
- Azul só para "agora" e "ao vivo". Verde, âmbar e vermelho só para estado.

### v2.2 (25/11, noite)
- **Programa**: itens em blocos por hora (10h, 11h, 12h…), arrastar pela alça (mouse e toque) e os horários se recalculam mostrando "era 10:00". No mockup começa em Rascunho; em Pronto a ordem trava.
- **Gaveta de prévia** (`assets/drawer.js`): clicar num item, deck ou música abre o template com fundo selecionável, fonte, título, texto e um timer que dá para testar. A mesma gaveta é usada no Programa e na Biblioteca.
- **Expandir → página de campos**: na gaveta, o botão Expandir (ou clicar na prévia) abre o layout em tela cheia. Cada bloco (rótulo, título, texto, timer) é arrastado no canvas e tem campos de texto, tamanho, largura, X/Y, alinhamento, cor e mostrar/ocultar. Presets: Centro, Contagem grande, Esquerda, Faixa embaixo. Aplicar volta para a gaveta; Descartar desfaz. O layout fica no item e aparece nas miniaturas do programa.
- **Biblioteca**: painel de música (números, Importar do YouTube, Nova faixa, Estúdio), decks com prévia de fundo e slides analisáveis, boards, modelos. "Ver como" mostra o que cada papel pode.
- **YouTube**: colar o link, ler o vídeo, escolher a legenda, baixar só a letra com os tempos (vídeo e áudio não são baixados), dividir em slides, revisar no Estúdio.
- **Permissões** (`equipe.html`): Admin edita tudo; Púlpito cria os slides do sermão; Operador vê os slides e projeta; Música cria faixas; Comunicação faz avisos; Leitor só vê.
- **Console**: abas Programa, Slides (o operador vê o que vem), Pendências e Pós-culto (checklist + notas).
- **Board** (`board.html`): Mapa mental, Moodboard, Quadro e Tudo junto, no estilo do XLIDE; X pequeno fecha. Criar tem Moodboard e Mapa mental.

Todos os blocos novos estão em `componentes.html`, com o conceito e a navegação nas duas larguras.

### v2.3 (25/11)
- **Menu por categoria** (`shell.js` → `.side`): Início · Slides (Músicas, Decks, Fundos de avisos, Modelos) · Estúdio (Fundos e fontes, Testar um slide, Editor de música) · Culto (Programa, Ao vivo, Tela, Relatório) · Ideias (Boards) · Igreja (Equipe). Botão Criar no topo (atalho N). No celular: barra com Início, Slides, Estúdio, +, Programa, Ao vivo e Menu (a mesma lista em folha).
- **Estúdio** (`kit.html`): testar (Música, Deck ou Aviso, com fundo, fonte, cor e tamanho; "Criar" guarda em Seus testes, `xlide.v2.tests`), catálogo de fundos com onde cada um está em uso, fontes com espécime e slide de exemplo, cores do texto em três fundos.
- **Fundos de avisos** (`XLOOK.PLAIN`, `plain:<id>`): Papel, Tinta, Grade, Coluna, Sábado, Brasa. Os claros escolhem tinta escura sozinhos (`XLOOK.inkOf`). Também aparecem na gaveta.

### v2.4 (25/11) · Console multiview
- `console.html`: tela grande (o que está na tela, com timer, estado e barra de progresso; metade esquerda volta, direita avança) + duas telas à direita (1 · A seguir, 2 · Depois; clique vai direto). Embaixo: item com relógio e o pad de controle grande em células (sem faixa de slides: as telas de cima já mostram) (agora, término, atraso, slide ‹ ›, play, item ⏮ ⏭, +1/+2/+5).
- Celular em pé: telas e pad logo abaixo. Celular deitado: telas à esquerda e pad à direita, sem barra.
- `LIVE.cmd.at(item, slide)` pula para um slide. `paintSlide` usa o look do Estúdio para músicas quando `look.js` está na página (console e tela).

### v2.5 (25/11) · Loops rodando
- Fundos `loop:` agora tocam o vídeo de verdade (mesmo player do XLIDE, `loopEmbed`: mudo, em loop, sem controles), não só a imagem.
- Tocam onde o slide anima: Testar e catálogo de loops do Estúdio, gaveta e página de campos, editor de música, as três telas do console e a tela do projetor. Miniaturas continuam com a imagem.
- `XLOOK.mount(el, html)` troca a letra sem recarregar o vídeo quando o fundo é o mesmo; `XLOOK.hydrate(root)` liga os players. A imagem fica embaixo enquanto o vídeo carrega.

### v2.6 (25/11) · Editar direto no slide
- `assets/canvas.js` (`CANVAS.attach`): o editor do slide, como no Canva. Clique seleciona (contorno azul com alças), clique de novo ou duplo clique escreve ali mesmo, arrastar move (com guia no centro), alças das laterais mudam a largura e as dos cantos o tamanho.
- Barra de cima: fonte do bloco, tamanho −/+, cor, negrito, alinhamento, posição (topo, meio, base, esquerda, centro, direita), caixa do timer, + Imagem (enviar do computador; vira um bloco que se move e redimensiona). Menu do bloco: Escrever, Centralizar, Ocultar. Teclado: setas movem, Enter escreve, Delete oculta, Esc solta.
- Em decks: Slide ‹ 2/4 ›, "Todos os slides" ou "Só este", e "Aplicar no próximo" (copia o layout deste slide para o seguinte).
- Onde: Testar do Estúdio (música, deck, aviso), gaveta do Programa e da Biblioteca, página de campos (Expandir). O que se escreve no slide volta para os campos e vice-versa.

### v2.7 (25/11) · Meus arquivos
- Menu lateral: cartão "quem sou eu" (nome, função, quantos arquivos, lixeira; clique troca de pessoa no mockup) e o grupo **Minhas pastas**: Avisos, Pregação, Início do culto, Oração, Versículos, depois Padrão, Arquivados e Lixeira, com contagem.
- `arquivos.html`: atalhos de pasta (como a referência "Shortcut"), grade ou lista de arquivos com estrela, menu ⋮ e pessoas, e prévia à direita (como a referência Dropbox) com Editar (gaveta com edição no slide), Duplicar / Usar modelo, Arquivar, Favoritar, Tornar padrão, Excluir; na Lixeira: Restaurar, Excluir para sempre (pede confirmação) e Esvaziar lixeira. Arraste um arquivo até uma pasta para mover. Toda ação tem Desfazer.
- Início: seção "Meus arquivos" com as pastas e os favoritos.
- Dados em `XL.files`; estado em `FILES` (shell.js, `xlide.v2.files`); componentes em `assets/files.js`. Pessoa atual em `xlide.v2.me`.

### v2.8 (25/11) · Agenda
- `agenda.html` (menu → Culto → Agenda): à esquerda o mês com marcadores coloridos por tipo, a escala do sábado e as tarefas (com check); no centro a semana, um dia por linha com o número gigante e o dia da semana em vermelho, eventos em cartões (horário grande, régua colorida, tipo, local ou online, pessoas), linha vermelha do "agora" no dia de hoje com "Próximo: … em 54 min", e + para criar evento; à direita o evento escolhido: slide do arquivo ligado sobre a grade de pontos, horário, tipo, local, tarefas, arquivos em pilha, equipe e atalhos para Programa e Ao vivo.
- Filtro Tudo / Cultos / Ensaios / Reuniões, semana ‹ Hoje ›. Eventos e tarefas novos ficam salvos neste navegador (`xlide.v2.agenda`).
- Os dias da semana seguem a história do mockup (culto no sábado 29/11), que é o calendário de 2025.

### v2.9 (25/11) · Trilha de fundo
- `assets/trilha.js` (`TRILHA`): uma trilha para o culto inteiro (fonte + volume, padrão 20%, "baixo") e, em cada tela, **Do culto**, outra fonte, ou **Sem trilha** (off). Música ao vivo, vídeo e sermão começam sem trilha; contagem, oração, avisos, ofertas, bênção e pausa usam a do culto.
- Fontes: as mixes do YouTube passadas pelo usuário (Mix 1: `H9U9E3c0Qzg` / `RDH9U9E3c0Qzg`; Mix 2: `RDgzBfPImKVa8`). Dá para colar outro link (vídeo, playlist ou mix) no Programa.
- Programa: chip ♪ em cada tela (culto · 20%, Mix 2 · 30%, off), campo "Trilha de fundo nesta tela" com volume na gaveta, e o cartão "Trilha de fundo do culto" com fonte, volume e "Ouvir antes".
- Ao vivo (console): painel com a faixa tocando (título real), Iniciar/Pausar, Próxima faixa, Mudo, volume e "Segue as telas" (liga, troca e desliga com fade a cada tela); linha Trilha / Volume − / Volume + no pad; ♪ nas três telas do multiview. O som sai do computador do console; a tela do projetor não toca.

### v2.10 (25/11) · Faixas da trilha, Programa Estúdio, menu recolhível
- Trilha (console): **Todas as faixas** de cada fonte (lidas da playlist; título e capa pelo oEmbed do YouTube), busca, **Expandir**, **Agora** (toca já, com fade) e **Em seguida** (fila; ao acabar a faixa, toca a fila e depois volta para a playlist). Embaixo das telas 1 e 2: a trilha daquela tela, **+ Trilha** (escolher a faixa), **Off**, **Do culto**. Arraste uma faixa da lista até a tela 1, 2 ou a grande: ela fica marcada para aquela tela e toca quando a tela entrar. Uma tela pode ter uma faixa própria (`track:<id>`).
- **Programa Estúdio** (`programa.html`, dados em `PROGS` no data.js, `xlide.v2.programs`): pastas Todos, Rascunhos, Salvos, Já feitos, Arquivados, Lixeira; cartões com Abrir, Duplicar, Arquivar, Lixeira (Restaurar / Excluir de vez). **Novo programa** (do modelo principal, jovem ou em branco), **Duplicar**, **Salvar rascunho**, **Salvar** (trava a ordem), nome e data editáveis, aviso de alterações não salvas, **Usar no ao vivo** (o programa no ao vivo vira o XL.program de todas as páginas).
- Lista do programa em **tabela**: Hora · Item · Tipo (tag colorida) · Trilha · Tempo · Ações (**Ocultar**: fica no programa e o ao vivo pula; **Arquivar**; **Lixeira**). Embaixo, Itens arquivados e Lixeira do programa com Restaurar.
- Menu lateral: grupos recolhíveis (abre sozinho o da página atual e lembra o resto), **Arquivos** com as **Pastas** dentro, sem descrições, pessoa no rodapé e **Criar** em destaque.

### v2.11 (25/11) · Visão geral e atalhos do menu
- **Início = Visão geral** (`inicio.html`), celular primeiro: hora grande com o número de pendências, saudação, estado ("6 coisas para resolver antes de sábado"), e os blocos: **Próximo culto** (contagem em dias e horas, prontidão por área, próximos programas, Programa / Ao vivo), **Validação** (o que falta: vídeo sem arquivo, letra sem tradução, programas em rascunho, equipamento), **Continuar editando?** (último arquivo, programa, música), **Atalhos** (o primeiro muda com o papel), **Moodboard recente**, **Último mapa mental**, **Duração típica** (média real × planejado, Principal / Jovem). A hora, a saudação e "Visão geral" ficam numa faixa no topo e os blocos usam a largura toda, alternando dois tons (claro e cinza) para separar.
- **Atalhos auxiliares do menu**: clicar no nome de um grupo (Slides, Estúdio, Culto, Ideias, Igreja) ou no ícone de grade de Arquivos abre um painel ao lado com um destaque e cartões com prévia e contagem. A seta só abre e fecha o grupo. Fecha com ✕, Esc ou clicando fora.

### v2.12 (25/11) · Editor de deck (vários slides, como no Canva)
- `deck.html` (`?f=<arquivo>`, `?d=<deck da Biblioteca>`, `?novo=<pasta>`): ferramentas à esquerda (Fundo, Layout, Texto, Imagem, Trilha, Atalhos), o slide no centro com a edição direto nele (canvas.js), e a fileira de slides embaixo com **+** (novo slide com a mesma estrutura do atual), duplicar, apagar e arrastar para reordenar.
- **Fundo**: Este slide / Todos os slides; Cores, Vídeos (com **Reprodução** ligada/desligada e **Em loop / Uma vez**), Avisos e **Imagens** (importar imagem do computador como fundo, atrás do texto). **Imagem**: inserir imagem como bloco solto. **Layout**: presets, aplicar em todos ou no próximo. **Texto**: mostrar/ocultar rótulo, título e texto, fonte e cor do deck. **Trilha**: lista de todas as faixas das fontes (abas, busca, ▶ ouvir antes num player no canto, **+ Adicionar**); no topo, "Trilha adicionada para esse slide" (ou "Trilha do deck: se estende por todos os slides") com Ouvir, Tirar e Sem trilha; **Este slide / Todos os slides** (a faixa do deck continua tocando de um slide para o outro); Trilha do culto, Sem trilha e volume. Cada miniatura de slide mostra uma etiqueta ♪ (azul: do slide; verde: do deck). Na apresentação a trilha toca e acompanha os slides. **Apresentar** em tela cheia com o vídeo rodando.
- Teclado: ← → (e PageUp/PageDown, Home/End) trocam de slide; N novo slide; ⌘D duplica; ⌫/Delete oculta o bloco selecionado ou, sem seleção, apaga o slide (com Desfazer); Enter escreve; Esc solta; ⌘S salva; P apresenta; ? mostra os atalhos. Avisos em vermelho quando não dá ("Este é o primeiro slide", "O deck precisa ter pelo menos um slide", "Esse arquivo não é uma imagem").
- Abre a partir de: Arquivos (Editar / duplo clique), Biblioteca (gaveta do deck → Abrir no editor; Novo deck), Programa (itens com deck), Estúdio (Abrir o editor de deck), Criar → Deck, Início (Continuar editando). Decks salvos em `xlide.v2.decks`; o arquivo em Meus arquivos atualiza a prévia e o número de slides.
- `XLOOK.backdrop(bg, image, { loop, play })`: vídeo em loop, uma vez ou parado; o template aceita imagem de fundo.

### v2.13 (25/11) · Trilha por tela, não do culto inteiro
- Programa: saiu o cartão "Trilha de fundo do culto" e a opção "Do culto". Toda tela começa **sem trilha**; a faixa se escolhe na gaveta de cada item (`TRILHA.picker`): a faixa escolhida no topo ("✓ Trilha adicionada para esta tela", Ouvir, Tirar), volume, abas por fonte, busca, a mix inteira ou cada faixa com ▶ (ouvir antes, num player no canto) e **+ Adicionar**, e Adicionar fonte.
- Ao vivo: na lista de faixas, **Selecionar** põe a faixa no controle de cima sem tocar; ela só começa com **Tocar trilha**. Em seguida continua pondo na fila.
- Editor de deck: sem "Trilha do culto"; sem nada escolhido, o slide fica sem trilha.

### v2.14 (25/11) · Projetar em tela inteira
- `tela.html` (o botão de tela no Ao vivo): o slide ocupa a tela toda, sem faixas pretas. Um clique em qualquer lugar (ou F) entra em tela cheia. R alterna para o quadro 16:9 com faixas, e a escolha fica lembrada.

### v2.15 (25/11) · Trocar de tela em duas etapas
- Ao vivo: clicar na tela 1 ou 2 só **põe em foco** (contorno amarelo, "Em foco"); o botão do meio do pad vira **Trocar**, com o nome da tela e se a trilha entra (♪ 20%) ou não (♪ off). Clicar em Trocar, na mesma tela de novo, ou Enter troca; o botão volta a ser Pausar. Esc ou clicar fora solta o foco. Se o culto avançar e a tela focada passar, o foco some sozinho.

### v2.16 (25/11) · Transições, cruzamento da trilha, música em reprodução, Ao vivo em miniatura
- **Transições entre telas** (`paintTransition` em render.js, `LIVE.cmd.transition`): Corte seco, **Fade** (padrão, ease-in-out), Slide (a próxima empurra a atual) e Sobrepor (a próxima está atrás e a atual some por cima). Seletor com prévia animada no pad do Ao vivo; vale no console, no projetor e na miniatura. Com o mesmo vídeo de fundo, só o texto faz a transição.
- **Trilha com cruzamento**: com uma faixa tocando, Selecionar outra a deixa **em espera** (a atual continua); o botão vira **Trocar com fade** e as duas se cruzam (dois players).
- **Música em reprodução**: numa tela de música, a trilha de fundo fica **bloqueada** (painel, pad, gaveta do Programa e telas 1/2) e aparece o painel da música: título, linha do tempo com as estrofes (clicar ou arrastar para ir a um ponto), Início, Voltar 10 s, Tocar/Pausar, Avançar 10 s, e "Slides seguem a música" (a estrofe troca nos tempos do editor de música).
- **Ao vivo em miniatura** (shell.js): com o culto rodando ou pausado, toda página (menos o console) mostra a tela projetada num quadro flutuante, que começa no canto inferior direito, arrasta pelo topo, fica sempre dentro da área da página, lembra a posição, minimiza (–) e abre o console.

### v2.17 (25/11) · Editor único, idiomas, tema
- **Um editor para tudo**: o botão de expandir da gaveta abre o editor de deck em tela cheia (`deck.html?p=<programa>&item=<item>`) para os itens do Programa (contagem com o timer, avisos, oração, sermão…; música vai para o editor de música), os decks da Biblioteca e os arquivos. Salvar grava de volta no programa (título, texto, fundo, fonte, layout e slides extras).
- **Idiomas** (`assets/i18n.js`, carregado pela casca em toda página): PT-BR, EN e NL, seletor no rodapé do menu, na barra do mockup e no Menu do celular (`xlide.v2.lang`). Traduz textos e placeholder/aria-label/title da interface, inclusive o que aparece depois, por dicionário (texto exato em português) e por padrões para frases com números e datas. Não traduz o conteúdo dos slides, o que se digita, nem a barra do mockup. Texto ambíguo leva `data-en` / `data-nl`.
- **Tema claro / escuro**: botão ao lado dos idiomas (e na barra do mockup); segue o sistema até você escolher (`xlide.v2.theme`).

### v2.18 (25/11) · Vídeo e áudio por link, piloto automático
- `assets/media.js`: links do YouTube, Vimeo, Spotify (faixa, álbum, playlist, episódio) e arquivos .mp4/.mp3. Onde toca: `[data-media-on="live"]` com som (projetor, Apresentar), `"muted"` sem som (tela grande do console), `"ctl"` com som e controles (faixa da música no console), `"edit"` no editor (vídeo sem som, áudio com o player à mão); sem isso, só a capa.
- Programa → Adicionar item → **Importar vídeo ou áudio por link**: título, duração e posição; vira um item "Vídeo / áudio" que entra do jeito que é (sem fonte nem estilo) e toca sozinho. Na gaveta de um item de música dá para pôr o link da faixa, que aparece com player no painel "Música em reprodução" do console.
- Editor de deck → **Mídia**: vídeo ocupa o slide (no lugar do fundo); áudio fica num player no canto e dá para tocar enquanto se edita texto e fundo; "Em todos os slides".
- **Piloto automático** (`LIVE.cmd.autopilot`, fica no estado do culto): botão grande acima das transições; ligado fica verde com a legenda "Passa para … em 2:03" e a barra do tempo; todo item passa quando o tempo acaba e os slides de um item se dividem pelo tempo dele. Desligado, volta ao manual (itens "avança sozinho" continuam passando).

## Estrutura compartilhada
| Arquivo | Papel | No app real |
| --- | --- | --- |
| `assets/tokens.css` | primitivos → semânticos, claro/escuro | `src/index.css` |
| `assets/ui.css` | todos os componentes | `src/components/live/*` |
| `assets/data.js` | dados fictícios | Supabase: `profiles`, `live_*`, `xlide_decks` |
| `assets/engine.js` | motor ao vivo + `timing()` | RPCs `live_run_*` + Realtime + `src/live/timing.ts` |
| `assets/render.js` | o que a tela mostra por tipo de item | `SlideView` + layouts novos |
| `assets/shell.js` | barra do mockup, navegação (barra/trilho), marca, folha "Criar", ícones | `app-header`, `logo.tsx`, Lucide |
| `assets/look.js` | fundos, loops e fontes das músicas | `slides/lyrics.tsx`, `lib/song-style.ts` |
| `assets/drawer.js` | gaveta de prévia: template com fundo, texto, fonte e timer | `SlideFrame` + painel de estilo |
| `assets/cards.js` | cartões e prévias: moodboard, deck, música; células de criar | `Dashboard.tsx` (PresentationCard), `Boards.tsx` |
| `assets/studio.css` + `studio.js` | Estúdio: canvas, trilha da música, ordem no culto | `Editor.tsx`, `editor/music-panels.tsx` |

Toda tela nova: copie o `<head>` de uma existente, use só classes do `ui.css` e registre novos blocos em `componentes.html`.

Os mockups não viram código de produção; servem de referência de telas, estados e componentes.
