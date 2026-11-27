# XLIDE · documento de contexto

> Para o Claude (e para quem chega na equipe). Atualizado em 27/11/2026.

## O que é

O **XLIDE** (xlide.vercel.app) é um sistema só para a comunicação da igreja: **slides** (decks multilíngues e músicas com letra sincronizada), **ideias** (boards com mapa mental, moodboard e quadro) e **culto** (programa do sábado, operação ao vivo, tela do projetor, página do público e relatório). No ditado aparece como "XSlide", "XLive", "Axlide" — é tudo o XLIDE.

Fluxo principal:

```
Boards (ideia, identidade)  →  Decks e músicas (biblioteca)  →  Programa (linha do tempo do culto)  →  Ao vivo
                                                                                                   ├─ Console (operador)
                                                                                                   ├─ Tela (projetor)
                                                                                                   └─ Público (/view, QR, sem login)
                                                              Relatório (planejado × real)  ◄──────┘
```

## Quem usa e o que pode

O XLIDE é fechado: só entra quem recebeu convite (Equipe → Convidar). Login com Google.

| Papel | Pode |
| --- | --- |
| **admin** (Administrador) | Tudo: equipe, convites, papéis, auditoria, configurações |
| **editor** | Cria e edita decks, músicas, programas, boards; usa o MCP |
| **operator** (Operador) | Vê e projeta; opera o ao vivo. Não edita. Sem MCP |
| **reader** (Leitor) | Só vê |

Áreas (responsáveis no programa): `music` (Música), `sound` (Sonoplastia), `comms` (Comunicação), `pulpit` (Púlpito).

Cada membro tem a **sua chave do MCP** (`xl_…`). Tudo o que o Claude faz com ela fica na auditoria no nome da pessoa.

## Rotas

### App (React)
| Rota | O que é |
| --- | --- |
| `/` | Abre a Visão geral (`/v2/inicio.html`) |
| `/login` | Entrar (Google). `?convite=<token>` aceita convite |
| `/slides` | Painel de slides (decks em grade). `?novo=<modelo|branco|ia>`, `?importar=1` (PDF/PPTX) |
| `/p/:id` | Editor do deck (slides, textos por língua, aba Identidade, pedidos para a IA) |
| `/present/:id` | Apresentar em tela cheia |
| `/play/:id` | Tocar música (slides avançam no tempo da letra) |
| `/remote/:id` | Controle remoto no celular (pede o código) |
| `/view/:id` | Página do público (sem login, idioma e tamanho de texto por pessoa) |
| `/print/:id` · `/fill/:id` | PDF / impressão |
| `/identity` | Identidades dos decks |
| `/music` | Importar música (YouTube → letra com tempos) |
| `/boards` · `/b/:id` | Boards; `?mode=mood` abre o moodboard. Público: `/board/:id` |
| `/settings` | **Configurações**: conectar ao Claude (MCP), skill especialista, auditoria (admin) |
| `/audit` | Atalho antigo → Configurações → Auditoria |

### Telas v2 (`/v2/…`)
| Rota | O que é |
| --- | --- |
| `inicio.html` | Visão geral: próximos cultos, recentes, atalhos, Criar |
| `biblioteca.html?tab=decks|songs|tpl` | Decks, músicas e modelos |
| `arquivos.html` | Meus arquivos por pasta: avisos, pregação, início do culto, oração, versículos |
| `kit.html` | Fundos e fontes (`#testar`, `#avisos`) |
| `estudio.html` | Editor de música (trilha, seções, tempos) |
| `agenda.html` | Agenda dos cultos |
| `programa.html` | Programas como arquivos; `?p=<id>` abre um; `?novo=<modelo>` cria |
| `console.html` | Ao vivo (operador): agora + 2 próximos, trilha de fundo, pendências, pós-culto |
| `tela.html` | Tela do projetor (16:9) |
| `relatorio.html` | Relatório do culto (planejado × real) |
| `equipe.html` | Equipe, convites, papéis, áreas |
| `board.html` | Board v2 (mapa + moodboard + quadro) |

## Modelo de dados (Supabase)

- `xlide_decks` — deck inteiro em `doc` (título por língua, slides, identidade, pedidos `ai`). Músicas são decks com slides `lyrics`.
- `xlide_boards` — boards (nós, ligações, itens do moodboard, etapas).
- `xlide_programs` — programas do culto (itens em ordem, data, início, minutos, estado).
- `xlide_files` — Meus arquivos (pasta, estado, estrela, deck ligado).
- `xlide_runs` — execução ao vivo (canal Realtime `xlide-live`).
- `profiles` — membros (nome, e-mail, papel, área). `xlide_invites`, `xlide_tokens` (chaves do MCP).
- `xlide_events` — uso (páginas, ações, buscas, erros, saídas). `xlide_audit` — quem mudou o quê (app ou MCP).

## Slides

Campos de texto (por língua): `eyebrow`, `title`, `subtitle`, `body`, `cta`. Estilo: `bg`, `font`, `tone`, `notes`; música: `section`, `repeat`, `at` (segundo em que entra).

| Layout | Uso |
| --- | --- |
| `aura` | Capa com fundo vivo (abertura forte) |
| `cover` | Capa clássica (título + subtítulo) |
| `chapter` | Separador de parte |
| `statement` | Uma frase grande (padrão) |
| `stats` | Números-chave |
| `services` | Lista de itens/serviços |
| `split` | Duas colunas / comparação |
| `image` | Imagem cheia |
| `gallery` | Grade de imagens/projetos |
| `reel` | Título + fileira de imagens |
| `questions` | Perguntas + imagens (classe, debate) |
| `moodboard` | Painel de referências |
| `contact` | Contato / encerramento |
| `lyrics` | Letra de música |

Fundos (`bg`): `wash:ember|amber|crimson|dusk|ocean|midnight|teal|mist|gold` · `plain:papel|tinta|grade|coluna|sabado|brasa` · `loop:<id YouTube>` · URL de imagem/vídeo. Fontes: `grotesk`, `serif`, `condensed`, `mono`.

**Identidade do deck:** `palette [{hex, name, role}]` (roles `primary`, `background`, `text`, `accent`, `support`), `fonts {heading, body}`, `references [{url, note}]`, `mood`, `notes`, `board_id`, `apply` (a cor principal vira destaque e as fontes valem nos slides).

Sistema visual do app: monocromático, sem cantos arredondados, BDO Grotesk + Fragment Mono, tema claro e escuro, interface em pt-BR, en e nl.

## Programa do culto

Item: `type` (`wait`, `prayer`, `song`, `notice`, `video`, `sermon`, `pause`, `media`), `title`, `minutes`, `text`, `owner`, `area`, `deck_id`, `song_id`, `media`, `advance` (`auto`/`manual`), `public`, `track` (trilha de fundo: `off`, `mix1`, `mix2` ou link do YouTube), `track_volume`, `mute` (vídeo sem o áudio original), `hidden`.

**Vídeo sem o áudio original + outra trilha.** No Programa, abra o item de vídeo (Vídeo / áudio com link do YouTube), desligue **Áudio original do vídeo** e escolha a trilha da tela logo abaixo (das mixes ou "Adicionar fonte" com o link da sua faixa). No projetor o vídeo toca mudo; no Ao vivo a trilha da tela toca no computador do console (mesa de som). Pelo MCP: `{ type: "media", media: "<link do vídeo>", mute: true, track: "<link da trilha>", track_volume: 70 }`. A trilha da tela fica gravada no próprio item (`bgm`), então vale em qualquer computador.

Estados: `rascunho` → `salvo` → `feito` · `arquivado` · `lixeira`. Transições: `fade` (padrão), `corte`, `slide`, `sobrepor`. Modelos: Culto principal, Culto jovem, Em branco.

## Ferramentas do MCP

- **Decks:** `list_decks`, `get_deck`, `create_deck`, `add_slides`, `update_slide`, `move_slide`, `remove_slides`, `deck_links`
- **Identidade e pedidos:** `get_deck_identity`, `set_deck_identity`, `list_ai_requests`, `resolve_ai_request`
- **Línguas:** `missing_translations`, `add_translations`
- **Música:** `create_song`
- **Arquivos:** `list_files`, `save_file`, `set_file_status`
- **Programas:** `list_programs`, `get_program`, `create_program`, `add_program_items`, `update_program_item`, `move_program_item`, `remove_program_items`, `set_program_status`, `set_program_settings`, `duplicate_program`
- **Boards:** `list_boards`, `get_board`, `create_board`, `add_nodes`, `update_node`, `connect_nodes`, `remove_items`, `add_mood_items`, `update_mood_item`, `brand_sheet`, `arrange`, `draw`, `preview_board`, `share_link`, `update_board`
- **Auditoria (admin):** `get_audit_report`, `get_audit_feed`
- **Esta skill:** `read_skill`

## Conectar o Claude

1. No XLIDE: **Configurações → Conectar ao Claude**. Toque em **Mostrar chave** e em **Copiar link** (o link já leva a chave: `https://xlide.vercel.app/api/mcp?key=xl_…`).
2. **claude.ai / Claude Desktop:** Configurações → Conectores → Adicionar conector personalizado → nome "XLIDE", cole o link → Adicionar.
3. **Claude Code:** `claude mcp add --transport http xlide "https://xlide.vercel.app/api/mcp?key=xl_…"`.
4. Ao conectar, o Claude já recebe as instruções desta skill pelo próprio MCP (ferramenta `read_skill`). Para a skill ficar fixa no Claude, baixe o `.zip` em Configurações → Skill especialista e envie em claude.ai → Configurações → Capacidades → Skills.

Trocou a chave ("Gerar nova")? A antiga para na hora: atualize o link no conector.
