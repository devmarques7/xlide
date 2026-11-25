# XLIDE v2 · mockups Live Church

HTML estático, sem build, **mobile-first** (390 px primeiro), na identidade do XLIDE (monocromático, sem raio, BDO Grotesk + Fragment Mono). Plano técnico: [`docs/live-church/integracao.md`](../../docs/live-church/integracao.md).

## Rodar
```bash
./mockups/v2/serve.sh         # http://localhost:4322/mockups/v2/
./mockups/v2/serve.sh --lan   # para abrir no celular
```

## Testar o culto
Abra `console.html`, `tela.html` e `ao-vivo.html` em abas (ou aparelhos na mesma origem). Dê play no console: as três andam juntas. Na barra preta do topo, **×10 / ×60** acelera o relógio para ver o avanço automático; **reiniciar culto** volta ao início. O ícone de Wi-Fi do console simula a queda de internet.

## Estrutura compartilhada
| Arquivo | Papel | No app real |
| --- | --- | --- |
| `assets/tokens.css` | primitivos → semânticos, claro/escuro | `src/index.css` |
| `assets/ui.css` | todos os componentes | `src/components/live/*` |
| `assets/data.js` | dados fictícios | Supabase: `profiles`, `live_*`, `xlide_decks` |
| `assets/engine.js` | motor ao vivo + `timing()` | RPCs `live_run_*` + Realtime + `src/live/timing.ts` |
| `assets/render.js` | o que a tela mostra por tipo de item | `SlideView` + layouts novos |
| `assets/shell.js` | barra do mockup, tab bar, ícones, folha inferior | `app-header`, Lucide |

Toda tela nova: copie o `<head>` de uma existente, use só classes do `ui.css` e registre novos blocos em `componentes.html`.

Os mockups não viram código de produção; servem de referência de telas, estados e componentes.
