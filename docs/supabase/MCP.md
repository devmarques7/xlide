# MCP do XLIDE · revisão de cobertura (develop, 25/11/2026)

Endereço: `/api/mcp?key=XLIDE_MCP_KEY` (Vercel ou `npm run dev`). 40 ferramentas: 15 de boards (`shared/board.js`) + 25 do Live Church (`api/_live.js`).
Tudo o que o MCP grava passa pelo Supabase e fica em `xlide_audit` com `via = mcp`.

## O que o XLIDE faz → ferramenta

| No app / mockup | Ferramenta MCP | Estado |
| --- | --- | --- |
| Criar deck com vários slides | `create_deck` (deck inteiro em uma chamada) | ✓ |
| Acrescentar slide com a mesma estrutura | `add_slides` (`after` = posição) | ✓ |
| Editar texto de um slide | `update_slide` (eyebrow, title, subtitle, body, cta, notes, por língua) | ✓ |
| Fundo, fonte, tom, seção, repetição, tempo na música | `update_slide` (bg, font, tone, section, repeat, at) | ✓ |
| Mover / apagar slide | `move_slide`, `remove_slides` | ✓ |
| Ver o deck | `get_deck` (contorno por língua), `deck_links` (editar, apresentar, tocar, remoto, público) | ✓ |
| Replicar para outras línguas | `missing_translations` → IA traduz → `add_translations` | ✓ pt, en, nl |
| Música do YouTube (letra + tempos) | `create_song` (`youtube_url`, ou `lyrics` colada; `translate_to`) | ✓ |
| Biblioteca (decks e músicas) | `list_decks` (`kind`: deck ou song) | ✓ |
| Meus arquivos: pastas, padrão, arquivados, lixeira | `list_files`, `save_file`, `set_file_status` | ✓ |
| Programa do culto completo | `create_program` (todos os itens), `get_program` (com horários) | ✓ |
| Itens: música, aviso, oração, espera, sermão, vídeo, vídeo/áudio por link | `add_program_items`, `update_program_item` (tipo, minutos, texto, responsável, deck, música, `media`) | ✓ |
| Arrastar e mudar horários | `move_program_item` (horários recalculados em `get_program`) | ✓ |
| Ocultar / arquivar / lixeira de item | `update_program_item` (`hidden`), `remove_program_items` (`to`: arquivo ou lixeira) | ✓ |
| Trilha de fundo por tela | `add_program_items` / `update_program_item` (`track`: off, mix1, mix2, link YouTube; `track_volume`) | ✓ |
| Rascunho, salvo, já feito, arquivado, lixeira; usar no ao vivo | `set_program_status` (`status`, `live`) | ✓ |
| Duplicar programa | `duplicate_program` | ✓ |
| Transição entre telas e piloto automático | `set_program_settings` | ✓ (gravado no programa) |
| Boards: mapa mental, moodboard, quadro | `create_board`, `add_nodes`, `add_mood_items`, `update_node`, `arrange`, `preview_board`… | ✓ (já existia) |
| Relatório de uso e auditoria | `get_audit_report` | ✓ |

## O que ainda não dá pelo MCP (e por quê)

| Parte | Motivo | Próximo passo |
| --- | --- | --- |
| Rodar o culto ao vivo (play, pausa, trocar tela, estender, encerrar) | O motor ao vivo ainda roda só no navegador (mockup / `engine.js`); não existe `live_runs` no banco | Criar `live_runs` + RPCs (`integracao.md` §5) e as ferramentas `run_*` |
| Escolher faixa específica da mix na trilha | A lista de faixas da mix vem do player do YouTube no navegador | `track` aceita link/id de vídeo; a mix inteira por `mix1`/`mix2` |
| Imagens novas para slides | Upload ainda vai para Redis/Blob | Bucket `xlide-media` já criado; ferramenta `upload_image` quando o app usar o bucket |
| Papéis por área (púlpito, música, operador) | RLS ainda é "equipe logada edita tudo" | Tabela de papéis + políticas por área |
| Telas novas do v2 no app (Programa Estúdio, Ao vivo multiview, editor de deck, Meus arquivos) | Estão nos mockups; o app real lê decks e boards | Construir as telas sobre `xlide_programs` e `xlide_files`, que o MCP já preenche |

## Como testar (depois do Supabase configurado)

```sh
npm run dev   # com .env.local
curl -s -X POST "localhost:3001/api/mcp?key=1423" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_program","arguments":{"title":"Culto teste","date":"2026-12-06","starts":"10:00","items":[{"type":"wait","title":"Contagem","minutes":5,"track":"mix1"},{"type":"song","title":"Luz da manhã","minutes":5},{"type":"media","title":"Vídeo","minutes":3,"media":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}]}}}'
```
