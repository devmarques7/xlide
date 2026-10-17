# XLIDE — notes for Claude

- **Always commit and push every change straight to `origin main`** (the owner deploys from it on Vercel). Run `npx tsc -p .` and `npm run build` before pushing.
- Stack: React 19 + Vite + Tailwind v4, shadcn-style components in `src/components/ui`, Lucide icons.
- Design rules: monochrome tokens in `src/index.css`, **no border radius anywhere**, BDO Grotesk (titles/text) + Fragment Mono (labels), light and dark themes via the `.dark` class on `<html>`.
- UI copy lives in `src/lib/i18n.ts` (en, pt-BR, nl) — add every new string in all three.
- Slide layouts: `src/slides/SlideView.tsx` + `src/slides/slides.css` (cq units, portrait rules).
- Realtime: WebSocket relay in `server/index.js` locally; on Vercel the `api/` functions + Upstash Redis with HTTP polling (`src/lib/sync.ts`).
