# XLIDE v2 · Live Church sobre o XLIDE

**Data:** 25/11/2026 · **Status:** proposta para o Daniel aprovar
**Escopo de origem:** "Escopo do Live Church" (RF-01 a RF-47).
**Mockups:** `mockups/v2/` (mobile-first, `./mockups/v2/serve.sh`).

## 1. A ideia em uma frase

O XLIDE deixa de ser um app de apresentações isolado (Redis + PIN 1423) e vira o **motor do culto**: os decks e as músicas que já fazemos no XLIDE viram *itens* de um **programa**, que roda sozinho ao dar play. Usuários, papéis e dados passam a morar no **Supabase**, o mesmo projeto da Classe (ADR-001), com um login para tudo.

```
Biblioteca (decks + músicas do XLIDE)  ──►  Programa (linha do tempo do sábado)  ──►  Execução (play)
                                                                                     ├─ Console (operador, celular/tablet)
                                                                                     ├─ Tela (projeção, tela cheia)
                                                                                     └─ Ao vivo (público, QR, sem login)
                                             Relatório (planejado × real)  ◄─────────┘
```

## 2. O que o XLIDE já tem e onde entra

| XLIDE hoje | Arquivo | Vira no Live Church | RF |
| --- | --- | --- | --- |
| Deck multilíngue (`LText`, en/pt/nl) | `src/lib/types.ts` | Conteúdo de itens Aviso, Sermão, Oração/Leitura | RF-13, RF-15 |
| Música: letra do YouTube/LRC, tradução, slides `lyrics` com `at`, `section`, `repeat` | `src/pages/Music.tsx`, `api/_music.js`, `src/slides/lyrics.tsx` | Biblioteca de músicas; divisão em slides já pronta | RF-11, RF-12, RF-13 |
| Play mode (slides avançam pelo tempo da música) | `src/pages/Play.tsx` | Avanço por tempo **dentro** do item Música | RF-18, RF-22 |
| Apresentação em tela cheia | `src/pages/Present.tsx` | Tela de projeção do programa | RF-29 a RF-32 |
| Controle no celular | `src/pages/Remote.tsx` | Console do operador (vira o centro de tudo) | RF-17 a RF-23 |
| Viewer público com idioma e tamanho de texto por pessoa | `src/pages/Viewer.tsx` | Página pública ao vivo + letra no celular | RF-34 a RF-37 (RF-37 é V3 e já está quase pronta) |
| Sync WS + BroadcastChannel + polling | `src/lib/sync.ts`, `server/index.js` | Fallback offline (local) do Realtime | NF falha de internet |
| PDF / impressão | `src/lib/pdf.ts`, `src/pages/Print.tsx` | Roteiro em PDF como plano B | NF contingência |
| i18n da interface (en, pt-BR, nl) | `src/lib/i18n.ts` | Interface do módulo | NF idiomas |
| MCP (boards) | `api/mcp.js` | IA monta o programa e a biblioteca | — |
| Boards / moodboard | `src/pages/Board.tsx` | Fica como está (planejamento de séries, identidade) | fora do MVP |

**Falta construir:** modelos e programas, motor de execução com tempo, papéis, relatório, login real, banco relacional.

## 3. Ferramentas de que precisamos

Em ordem de necessidade. Marcado **MVP** o que bloqueia o primeiro culto.

| # | Ferramenta | Para quê | Fase |
| --- | --- | --- | --- |
| 1 | `@supabase/supabase-js` no front | Cliente único: auth, dados, realtime, storage | MVP |
| 2 | **Supabase Auth** (Google + link mágico) | Substitui o PIN 1423. Mesmo login da Classe | MVP |
| 3 | Tabelas `xlide_*` e `live_*` com RLS por `church_id` | Decks, músicas, programas, execuções, papéis | MVP |
| 4 | RPCs `live_run_*` com `expected_version` | Comandos do culto (play, pausa, estender…) sem dois operadores brigando (ADR-003) | MVP |
| 5 | **Supabase Realtime** (Broadcast + Postgres Changes em `live_runs`) | Troca de item/slide em < 2 s na tela e na página pública; substitui o polling de 2,5 s | MVP |
| 6 | **Supabase Storage** (bucket `xlide-media`) | Imagens e slides; acaba com o problema de Redis cheio (OOM de 24/11) | MVP |
| 7 | Script de migração Redis → Supabase | Copiar decks e boards existentes (modelo: `scripts/migrate-images-to-blob.mjs`) | MVP |
| 8 | `supabase gen types` | Tipos TS gerados do banco, ao lado de `src/lib/types.ts` | MVP |
| 9 | **Vitest** | Testar as funções puras `computeTiming` e `lyricsToSlides`; o XLIDE hoje não tem testes | MVP |
| 10 | Cache offline: Service Worker + IndexedDB | Programa, decks e fontes no aparelho; fila de comandos reenviada ao reconectar | MVP (o ponto mais sensível) |
| 11 | Verificação do JWT nas funções `api/` | `api/_music.js` e `api/mcp.js` aceitam só usuário logado / chave MCP | MVP |
| 12 | Ferramentas MCP novas | `list_programs`, `create_program`, `add_program_items`, `get_run`, `list_songs` | V2 |
| 13 | Chaves MCP em `mcp_keys` (já existe na Classe, 033) | Substitui `XLIDE_MCP_KEY` única | V2 |
| 14 | Views SQL `live_v_item_timing`, `live_v_template_stats` | Relatório e médias | V2 |

O que **não** precisamos agora: Edge Functions (as funções da Vercel já resolvem), outro banco, app nativo, fila/worker.

## 4. Dados no Supabase

Tudo com `church_id`, RLS ligado e só leitura nas tabelas da Classe (`profiles`, `churches`).

| Tabela | Campos principais | Observação |
| --- | --- | --- |
| `xlide_decks` | `id`, `church_id`, `kind` (`deck`/`song`), `title` jsonb, `doc` jsonb, `tags`, `updated_by`, `updated_at` | `doc` guarda o `Presentation` do XLIDE inteiro, sem refatorar o editor |
| `xlide_boards` | `id`, `church_id`, `doc` jsonb | Boards saem do Redis |
| `live_roles` | `church_id`, `user_id`, `role` (`admin`/`operator`/`editor`/`reader`), `area` (`music`/`sound`/`comms`/`pulpit`) | `profiles.role in (admin, manager)` da Classe = admin do Live automaticamente |
| `live_service_types` | `id`, `name` jsonb, `slug` (endereço fixo do QR) | Culto principal, jovem, infantil |
| `live_templates` / `live_template_items` | itens com `type`, `title`, `planned_s`, `area`, `advance` (`auto`/`manual`), `public` | Modelo por tipo de culto |
| `live_programs` | `date`, `service_type_id`, `state` (`draft`/`ready`/`live`/`done`), `starts_at`, `target_s` | Uma edição do modelo |
| `live_program_items` | `position`, `type`, `title` jsonb, `planned_s`, `owner_id`, `area`, `advance`, `deck_id`, `public`, `notes` | `deck_id` aponta para a música ou deck do XLIDE |
| `live_runs` | `program_id`, `status`, `index`, `slide`, `item_started_at`, `paused_at`, `paused_ms`, `extended_ms`, `version`, `operator_id` | Uma linha viva; Realtime ligado |
| `live_item_runs` | `run_id`, `item_id`, `started_at`, `ended_at`, `extensions`, `skipped`, `controlled_by` | Os tempos reais (RF-40) |
| `live_audit` | `table`, `row_id`, `user_id`, `at`, `diff` jsonb | Quem mudou o quê (RF-46) |

Leitura pública (página ao vivo): só por RPC `live_public_program(slug)` que devolve itens com `public = true`. Anon nunca lê tabela direto.

## 5. Como o motor roda

- O servidor guarda **carimbos de tempo**, não um cronômetro. O cliente calcula o tempo restante com `computeTiming(run, items, now)` (puro, testado), corrigindo o relógio pela RPC `server_time`.
- O avanço automático é disparado pelo **console** quando o tempo zera em item `auto`; Sermão, Oração e Pausa livre nunca avançam sozinhos.
- Música: dentro do item, os slides seguem o `at` da letra (Play mode do XLIDE) ou o operador toca para avançar.
- Sem internet: console e tela no mesmo aparelho/rede continuam pelo `BroadcastChannel`/WebSocket local que o XLIDE já tem; os comandos vão para uma fila e sobem quando a conexão volta. A faixa "offline" aparece no console.

## 6. Mobile-first: o que muda no XLIDE

O XLIDE nasceu para desktop (editor) + celular (remote). No v2 **toda tela começa em 390 px** e cresce:

| Tela | Celular | Tablet / computador |
| --- | --- | --- |
| Início | Próximo culto + minhas tarefas | + calendário |
| Programa | Lista vertical de itens, edição em folha inferior | Lista + painel do item ao lado |
| Biblioteca | Busca + lista | Grade com prévia |
| Console | Item atual grande + 4 botões grandes no polegar | + prévia do slide e lista do programa |
| Tela | — | Projeção 16:9 |
| Ao vivo | Página pública | igual, centralizada |

Componentes compartilhados: ficam em `mockups/v2/assets/ui.css` e na página `componentes.html`. Quando virarem código, vão para `src/components/live/`.

## 7. Ordem sugerida

1. **F0 · Fundação** (1 semana): Supabase no XLIDE, login, `xlide_decks` + migração do Redis, Storage. O XLIDE continua igual para o usuário, mas sem PIN.
2. **F1 · Programa** (1 semana): modelos, programas, itens com músicas e decks da biblioteca, papéis por área.
3. **F2 · Execução** (2 semanas): RPCs, Realtime, console, tela, offline, roteiro PDF, tempos reais. Ensaio com a equipe.
4. **V2**: página pública, relatório, histórico, MCP do Live.

## 8. Decisões que preciso de você

- [ ] **Isto substitui o ADR-002** (app Next.js novo em `~/igreja-plataforma`) para o Live Church? Proposta: sim, o Live mora no XLIDE (Vite + React); CIRCLE, Points e Hub seguem o plano de lá e leem o Live pela RPC pública. Registrado como ADR-005 (proposto) no igreja-plataforma.
- [ ] O PIN de pareamento do celular continua? Proposta: login normal, e um **código de 4 dígitos por execução** para parear um tablet extra sem conta.
- [ ] Decks de clientes da MediaMarques (Nova Semente, brand guidelines) ficam no mesmo XLIDE? Proposta: sim, com `church_id` nulo = espaço do estúdio, invisível para a igreja.
