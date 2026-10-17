# XLIDE

Apresentações web multilíngues (EN · PT · NL), com controle remoto pelo celular e QR code para o público.

## Rodar

```bash
npm install
npm run dev        # API + WebSocket (3001) e Vite (5173, exposto na rede)
# produção
npm run build && npm start   # tudo em http://localhost:3000
```

Código de acesso (mock): **1423**. Ele vale para o login, o dashboard e para parear um celular como controle.

Para o celular conectar, ele precisa estar no mesmo Wi-Fi. Os QR codes trocam `localhost` pelo IP da rede automaticamente.

## Páginas

| Rota | O que faz |
| --- | --- |
| `/login` | Teclado numérico estilo iPhone |
| `/` | Dashboard: barra de busca central (título, conteúdo, tags, notas, todas as línguas) |
| `/p/:id` | Editor: slides arrastáveis, preview, abas Conteúdo / Design / Análise / JSON / Apresentação |
| `/present/:id` | Apresentação em tela cheia; tocar no slide abre a barra de ações |
| `/remote/:id` | Controle no celular (pede o código) com notas e próximo slide |
| `/view/:id` | Público: acompanha ao vivo, cada pessoa escolhe língua e tamanho de texto |
| `/identity` | Sistema de identidade (cores, tipografia, grid, componentes, ícones, movimento) |

## Formato JSON

```json
{
  "title": { "en": "My talk", "pt": "Minha palestra", "nl": "Mijn praatje" },
  "languages": ["en", "pt", "nl"],
  "defaultLanguage": "en",
  "slides": [
    { "layout": "cover", "eyebrow": "Your name", "title": { "en": "Hello\nworld", "pt": "Olá\nmundo" } },
    { "layout": "stats", "title": "Key\nfigures", "items": [{ "value": "17", "label": { "en": "Scenes", "pt": "Cenas" } }] }
  ]
}
```

Cada campo de texto aceita uma string (igual em todas as línguas) ou um objeto com uma tradução por língua.
Layouts: `cover`, `stats`, `services`, `gallery`, `split`, `statement`, `contact`, `image`.
Campos: `eyebrow`, `title`, `subtitle`, `body`, `cta`, `image`, `notes`, `inverse`, `items[]` (`label`, `value`, `text`, `meta`, `icon`, `image`).
Texto simples também funciona: cada linha que começa com `# ` inicia um novo slide.

## Stack

React 19 + Vite + Tailwind v4, componentes no estilo shadcn/ui (Radix), ícones Lucide, dnd-kit, qrcode.react.
O servidor é Express + ws. Ele guarda as apresentações em `server/data.json` e repassa a sincronização ao vivo.
No navegador os dados também ficam em `localStorage`. Sem servidor, as abas do mesmo navegador continuam sincronizadas via BroadcastChannel.
