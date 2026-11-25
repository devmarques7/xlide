-- XLIDE v2 · uso e auditoria.
-- xlide_events: o que as pessoas fazem (páginas, buscas sem resultado, erros, saídas).
-- xlide_audit: quem mudou o quê (decks, boards, arquivos, programas), gravado por trigger.
-- xlide_audit_report(dias): o relatório completo em um JSON (usado pela página /audit e pelo MCP).

create table if not exists public.xlide_events (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  session text not null,
  kind text not null check (kind in ('page_view', 'leave', 'search', 'search_empty', 'error', 'action', 'retry')),
  path text,
  target text,
  ms int,          -- tempo na página (leave) ou duração da ação
  meta jsonb not null default '{}'::jsonb
);
create index if not exists xlide_events_at on public.xlide_events (at desc);
create index if not exists xlide_events_kind on public.xlide_events (kind, at desc);
create index if not exists xlide_events_session on public.xlide_events (session, at);

create table if not exists public.xlide_audit (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid,
  via text not null default 'app', -- 'app', 'mcp', 'migration'
  table_name text not null,
  row_id text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  title text,
  diff jsonb
);
create index if not exists xlide_audit_at on public.xlide_audit (at desc);

-- Trigger de auditoria: grava a ação, o título e, no update, só as chaves de doc que mudaram.
create or replace function public.xlide_audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rid text := coalesce(new.id, old.id);
  t text := coalesce(new.title, old.title);
  d jsonb := null;
  via text := coalesce(current_setting('xlide.via', true), case when auth.uid() is null then 'mcp' else 'app' end);
begin
  if tg_op = 'UPDATE' and new.doc is distinct from old.doc then
    select jsonb_object_agg(k, true) into d from (
      select key k from jsonb_each(coalesce(new.doc, '{}')) n
      where n.value is distinct from (coalesce(old.doc, '{}') -> n.key)
    ) x;
  end if;
  insert into public.xlide_audit (user_id, via, table_name, row_id, action, title, diff)
  values (auth.uid(), via, tg_table_name, rid, lower(tg_op), t, d);
  return coalesce(new, old);
end $$;

do $$ declare tb text; begin
  foreach tb in array array['xlide_decks', 'xlide_boards', 'xlide_programs'] loop
    execute format('drop trigger if exists audit on public.%I', tb);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.xlide_audit_row()', tb);
  end loop;
end $$;
-- arquivos usam "name" no lugar de "title"
create or replace function public.xlide_audit_files() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.xlide_audit (user_id, via, table_name, row_id, action, title, diff)
  values (auth.uid(), case when auth.uid() is null then 'mcp' else 'app' end, 'xlide_files', coalesce(new.id, old.id), lower(tg_op), coalesce(new.name, old.name),
          case when tg_op = 'UPDATE' then jsonb_build_object('status', new.status, 'folder', new.folder) end);
  return coalesce(new, old);
end $$;
drop trigger if exists audit on public.xlide_files;
create trigger audit after insert or update or delete on public.xlide_files for each row execute function public.xlide_audit_files();

alter table public.xlide_events enable row level security;
alter table public.xlide_audit enable row level security;
-- eventos entram pelo servidor (api/events, chave de serviço); a equipe logada lê
drop policy if exists "equipe lê eventos" on public.xlide_events;
create policy "equipe lê eventos" on public.xlide_events for select to authenticated using (true);
drop policy if exists "equipe lê auditoria" on public.xlide_audit;
create policy "equipe lê auditoria" on public.xlide_audit for select to authenticated using (true);

-- O relatório completo.
create or replace function public.xlide_audit_report(days int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  with ev as (select * from public.xlide_events where at > now() - make_interval(days => days)),
  last_in_session as (
    select distinct on (session) session, path from ev where kind in ('page_view', 'leave') order by session, at desc
  )
  select jsonb_build_object(
    'days', days,
    'totals', (select jsonb_build_object('sessions', count(distinct session), 'people', count(distinct user_id), 'page_views', count(*) filter (where kind = 'page_view'), 'errors', count(*) filter (where kind = 'error'), 'empty_searches', count(*) filter (where kind = 'search_empty')) from ev),
    -- o que as pessoas mais abrem
    'top_pages', coalesce((select jsonb_agg(x) from (select path, count(*) views, count(distinct user_id) people, round(avg(ms) filter (where kind = 'leave') / 1000.0) avg_s from ev where kind in ('page_view', 'leave') group by path order by count(*) filter (where kind = 'page_view') desc limit 15) x), '[]'),
    -- onde têm mais dificuldade: erros, tentativas repetidas e buscas vazias por página
    'friction', coalesce((select jsonb_agg(x) from (select path, count(*) filter (where kind = 'error') errors, count(*) filter (where kind = 'retry') retries, count(*) filter (where kind = 'search_empty') empty_searches, (count(*) filter (where kind = 'error') * 3 + count(*) filter (where kind = 'retry') * 2 + count(*) filter (where kind = 'search_empty')) score from ev group by path having count(*) filter (where kind in ('error', 'retry', 'search_empty')) > 0 order by 5 desc limit 15) x), '[]'),
    -- de onde saem (última página da sessão)
    'exits', coalesce((select jsonb_agg(x) from (select path, count(*) sessions from last_in_session group by path order by 2 desc limit 15) x), '[]'),
    -- o que não encontram
    'not_found', coalesce((select jsonb_agg(x) from (select lower(trim(target)) query, path, count(*) times, max(at) last_at from ev where kind = 'search_empty' and target is not null group by 1, 2 order by 3 desc limit 25) x), '[]'),
    'errors', coalesce((select jsonb_agg(x) from (select target message, path, count(*) times, max(at) last_at from ev where kind = 'error' group by 1, 2 order by 3 desc limit 15) x), '[]'),
    -- quem mudou o quê
    'changes', coalesce((select jsonb_agg(x) from (select a.at, a.via, a.table_name, a.row_id, a.action, a.title, a.diff, p.name person from public.xlide_audit a left join public.profiles p on p.id = a.user_id where a.at > now() - make_interval(days => days) order by a.at desc limit 50) x), '[]'),
    'changes_by_person', coalesce((select jsonb_agg(x) from (select coalesce(p.name, a.via) person, count(*) changes from public.xlide_audit a left join public.profiles p on p.id = a.user_id where a.at > now() - make_interval(days => days) group by 1 order by 2 desc) x), '[]')
  )
$$;
revoke all on function public.xlide_audit_report(int) from public, anon;
grant execute on function public.xlide_audit_report(int) to authenticated, service_role;
