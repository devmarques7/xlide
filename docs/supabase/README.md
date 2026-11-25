# XLIDE v2 · Supabase (branch develop)

Branches: **main** (o que está no ar), **develop** (integração com Supabase, para testar local), **mockups** (os mockups v2, mesma estrutura de `mockups/v2/`).

## O que já está pronto no código

| Parte | Onde | O que faz |
| --- | --- | --- |
| Banco | `supabase/migrations/20261125120000_xlide_init.sql` | `profiles` (criado no 1º login), `xlide_decks`, `xlide_boards`, `xlide_files`, `xlide_programs`, `xlide_migration_log`, bucket `xlide-media`, RLS (só a equipe logada) |
| Uso e auditoria | `supabase/migrations/20261125130000_xlide_audit.sql` | `xlide_events` (páginas, buscas vazias, erros, saídas), `xlide_audit` (trigger: quem mudou o quê, app ou MCP), `xlide_audit_report(dias)` |
| Dados | `api/_supabase.js`, `api/presentations/*`, `api/_boards.js`, `server/index.js` | Com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, decks e boards são lidos e gravados no Supabase (Vercel e servidor local). Sem elas, tudo segue no Redis / arquivos, como hoje. |
| Login | `src/lib/supabase.ts`, `src/lib/auth.ts`, `src/pages/Login.tsx` | Com `VITE_SUPABASE_*`, a página de login mostra **Entrar com o Google** no lugar do código 1423 |
| Migração | `scripts/migrate-redis-to-supabase.mjs` | Copia decks e boards do Redis (ou `--local`) para o Supabase, confere cada um e registra. **Só lê o Redis.** Imagens ficam onde estão (`/api/images/<id>`). |
| Relatório | `/audit` (`src/pages/Audit.tsx`), `api/audit.js`, `src/lib/track.ts` | Mais abertas, onde travam, de onde saem, o que não encontram, erros, quem mudou o quê |
| MCP | `api/_live.js` (+ boards em `shared/board.js`) | Decks e slides, textos por língua e tradução, programas do culto, relatório. Mesmo endereço: `/api/mcp?key=…` |

## Passo a passo (uma vez)

1. **Criar o projeto** em supabase.com → New project (nome `xlide`, região Europa). Anote a URL, a chave `anon` e a `service_role` (Settings → API).
2. **Rodar as migrações**: SQL Editor → cole e rode os dois arquivos de `supabase/migrations/` em ordem (ou `supabase link` + `supabase db push`).
3. **Google**:
   - Google Cloud Console → APIs & Services → Credentials → *OAuth client ID* (Web). Authorized redirect URI: `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
   - Supabase → Authentication → Providers → Google: cole Client ID e Secret, ative.
   - Supabase → Authentication → URL Configuration: Site URL `http://localhost:5173`; Redirect URLs `http://localhost:5173/**` e o domínio da Vercel `https://SEU-DOMINIO/**`.
4. **`.env.local`** na raiz (copie `.env.example`) com as quatro chaves do Supabase e o `REDIS_URL` do XLIDE (Vercel → Storage).
5. **Copiar os dados atuais** (o Redis não muda):
   ```sh
   node scripts/migrate-redis-to-supabase.mjs --dry   # conta
   node scripts/migrate-redis-to-supabase.mjs         # copia e confere
   ```
   Se também quiser os decks do servidor local: `--local`.
6. **Testar local**: `git checkout develop && npm run dev` → http://localhost:5173 → Entrar com o Google → seus decks e boards aparecem. `/audit` mostra o relatório.
7. **Vercel (preview da develop)**: Project → Settings → Environment Variables, escopo *Preview*, as mesmas variáveis. A `main` continua no Redis até decidirmos mudar.

## MCP (conectar a IA na nuvem)

`https://SEU-DOMINIO/api/mcp?key=XLIDE_MCP_KEY` (ou `Authorization: Bearer …`). Ferramentas novas:

- Decks: `list_decks`, `get_deck`, `create_deck` (deck inteiro em uma chamada), `add_slides`, `update_slide`, `move_slide`, `remove_slides`
- Línguas: `missing_translations` → a IA traduz → `add_translations` (pt, en, nl)
- Programa: `list_programs`, `get_program`, `create_program` (todos os itens), `add_program_items`, `update_program_item`, `move_program_item`, `remove_program_items`, `set_program_status` (inclui pôr no ao vivo), `duplicate_program`
- Auditoria: `get_audit_report`

Tudo o que o MCP muda entra em `xlide_audit` com `via = mcp`.

## O que ainda não está ligado

- O app real ainda não tem as telas do v2 (Programa Estúdio, Ao vivo multiview, editor de deck novo, Meus arquivos): elas estão nos mockups. As tabelas e o MCP já guardam programas e arquivos para quando forem construídas.
- Papéis por área (admin, púlpito, música, operador): por enquanto toda a equipe logada edita tudo.
- Imagens novas continuam indo para o Redis/Blob; mover para o bucket `xlide-media` é o próximo passo.
