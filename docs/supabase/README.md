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

## XLIDE v2 no app (`/v2/`) · 26/11

As telas dos mockups v2 agora rodam dentro do app, ligadas ao Supabase (projeto `fazbojlfbnglvuzcdcxy`). Entrada: botão **Live Church** no topo do XLIDE, ou `/v2/`.

| Parte | Onde | O que faz |
| --- | --- | --- |
| Telas | `public/v2/*.html` + `public/v2/assets/` | Início, Arquivos, Biblioteca, Programa, Ao vivo (console), Tela, Agenda, Estúdio, Editor de deck, Editor de música, Boards, Relatório, Equipe. Sem a barra do mockup. `mockups/v2/` continua como referência. |
| Ponte | `public/v2/assets/cloud.js` | Login obrigatório (volta para a mesma tela), cópia local para abrir na hora, toda gravação sobe para o banco, Realtime recebe as mudanças dos outros, fila quando cai a internet, imagens `data:` vão para o bucket `xlide-media`. |
| Config | `vite.config.ts` → `/v2/config.js` | URL e chave anon a partir de `VITE_SUPABASE_*`. Sem elas o v2 roda como mockup (dados de exemplo). |
| Banco | `supabase/migrations/20261126*` | `xlide_kv` (decks do editor novo, agenda, visuais, trilha, setlist, testes, imagens), `xlide_runs` (o culto ao vivo), `xlide_live_public()` (página pública sem login), `xlide_server_time()`, Realtime nas tabelas, papéis (1ª pessoa = admin; só admin muda papéis). |

De onde vem cada coisa: pessoas = `profiles`; músicas e decks = `xlide_decks` (os mesmos do editor clássico e do MCP); boards = `xlide_boards` (abrem no editor de boards); programas = `xlide_programs` (o mesmo formato do MCP); arquivos = `xlide_files`; culto = `xlide_runs` + broadcast `xlide-live`. No fim do culto o tempo real de cada item vai para o programa (`runLog`) e o Relatório/Início usam isso.

## Sistema fechado: convites e chave do MCP · 26/11

Migrações `20261126130000_xlide_invites.sql` e `20261126140000_xlide_grants.sql`.

| Parte | Como funciona |
| --- | --- |
| Convite | O admin abre **Equipe → Convidar** (e-mail, nome, papel, área). Sai um link `/login?convite=<token>` para copiar, mandar pelo WhatsApp ou por e-mail. Vale **uma vez**, só para **aquele e-mail**, por 14 dias. Um convite novo para o mesmo e-mail cancela o anterior. Pendentes aparecem em Equipe e podem ser cancelados. |
| Cadastro | A pessoa abre o link e entra com o Google ou com o link por e-mail. Sem convite pendente para o e-mail, o banco **nem cria a conta** (gatilho `xlide_gate_signup` em `auth.users`). Com convite, o perfil nasce com o papel do convite e o convite fica usado. |
| Membro | Membro = quem tem perfil. Todas as tabelas, o bucket `xlide-media` e o canal ao vivo exigem membro. Escrever: decks, boards e arquivos = admin e editor; programa, execução e listas do v2 = admin, editor e operador; leitor só vê. |
| Tirar da equipe | Equipe → pessoa → **Tirar da equipe** apaga o perfil: a pessoa perde o acesso e a chave do MCP cai junto. Para voltar, convite novo. |
| Chave do MCP | Cada membro ganha a sua ao entrar (`xl_…`, tabela `xlide_tokens`). Aparece em **Equipe → Minha chave do MCP** e no **Conectar IA** dos boards, com **Gerar nova** (a antiga para na hora). O MCP exige admin ou editor e o que ele muda entra na auditoria **no nome do dono da chave**. |
| APIs | Com o Supabase ligado, `/api/presentations` e `/api/boards` (lista, gravar, apagar), `/api/images` (enviar), `/api/audit` e `/api/images/gc` (admin) pedem a sessão do app ou a chave da pessoa. Abrir um deck ou board pelo id continua público (Viewer, Remote, /fill, link do board). |
| `XLIDE_MCP_KEY` | Opcional. Se definida, vale como chave de serviço (admin). Sem Supabase, o comportamento antigo (1423) segue igual. |

Primeiro admin: rode no SQL Editor (troque o e-mail se precisar) e abra o link `/login?convite=<token>` que ele devolve:

```sql
insert into public.xlide_invites (email, name, role, expires_at)
values ('SEU-EMAIL', 'Seu nome', 'admin', now() + interval '30 days') returning token;
```

## O que ainda falta (precisa do Daniel)

- **Google**: ativar o provedor Google no Supabase (passo 3 acima). Até lá, a tela de login também aceita **link por e-mail**.
- **URL Configuration** no Supabase: Site URL e Redirect URLs (`http://localhost:5173/**` e o domínio da Vercel).
- **`SUPABASE_SERVICE_ROLE_KEY`** e **`REDIS_URL`** no `.env.local` (e na Vercel, escopo Preview) para o MCP, os eventos e para copiar os decks e boards atuais: `node scripts/migrate-redis-to-supabase.mjs`. Sem isso o v2 abre vazio (sem músicas/decks) e o editor clássico continua lendo o Redis.
- Permissões por papel: o banco já trava (ver acima); as telas ainda mostram os botões de editar para o operador e o leitor (a gravação é recusada).
