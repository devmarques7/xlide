-- XLIDE · auditoria v2 (Configurações → Auditoria, só admin).
-- 1. Conserto: o servidor (service_role) não tinha permissão nas sequências → todo evento de uso
--    (/api/events) era recusado em silêncio e xlide_events ficava vazio.
-- 2. Relatório com pessoas, jornadas (de qual página para qual), ações mais usadas e páginas lentas.
-- 3. xlide_audit_feed: a linha do tempo de tudo o que cada pessoa fez (uso + mudanças), com filtro por pessoa.
-- O relatório e a linha do tempo só rodam pelo servidor; /api/audit confere se quem pede é admin.

grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

create or replace function public.xlide_audit_report(days int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  with ev as (select * from public.xlide_events where at > now() - make_interval(days => days)),
  au as (select * from public.xlide_audit where at > now() - make_interval(days => days)),
  last_in_session as (
    select distinct on (session) session, path from ev where kind in ('page_view', 'leave') order by session, at desc
  ),
  pv as (
    select session, path, lead(path) over (partition by session order by at) nxt from ev where kind = 'page_view'
  )
  select jsonb_build_object(
    'days', days,
    'totals', (select jsonb_build_object(
      'sessions', count(distinct session), 'people', count(distinct user_id),
      'page_views', count(*) filter (where kind = 'page_view'), 'actions', count(*) filter (where kind in ('action', 'retry')),
      'errors', count(*) filter (where kind = 'error'), 'empty_searches', count(*) filter (where kind = 'search_empty'),
      'changes', (select count(*) from au)) from ev),
    'top_pages', coalesce((select jsonb_agg(x) from (select path, count(*) filter (where kind = 'page_view') views, count(distinct user_id) people, round(avg(ms) filter (where kind = 'leave') / 1000.0) avg_s from ev where kind in ('page_view', 'leave') group by path order by 2 desc limit 15) x), '[]'),
    'friction', coalesce((select jsonb_agg(x) from (select path, count(*) filter (where kind = 'error') errors, count(*) filter (where kind = 'retry') retries, count(*) filter (where kind = 'search_empty') empty_searches, (count(*) filter (where kind = 'error') * 3 + count(*) filter (where kind = 'retry') * 2 + count(*) filter (where kind = 'search_empty')) score from ev group by path having count(*) filter (where kind in ('error', 'retry', 'search_empty')) > 0 order by 5 desc limit 15) x), '[]'),
    'exits', coalesce((select jsonb_agg(x) from (select path, count(*) sessions from last_in_session group by path order by 2 desc limit 15) x), '[]'),
    'not_found', coalesce((select jsonb_agg(x) from (select lower(trim(target)) query, path, count(*) times, max(at) last_at from ev where kind = 'search_empty' and target is not null group by 1, 2 order by 3 desc limit 25) x), '[]'),
    'errors', coalesce((select jsonb_agg(x) from (select target message, path, count(*) times, max(at) last_at from ev where kind = 'error' group by 1, 2 order by 3 desc limit 15) x), '[]'),
    -- caminhos: de qual página as pessoas vão para qual
    'journeys', coalesce((select jsonb_agg(x) from (select path "from", nxt "to", count(*) times from pv where nxt is not null and nxt <> path group by 1, 2 order by 3 desc limit 20) x), '[]'),
    -- botões e ações mais usados (e os repetidos, sinal de dificuldade)
    'top_actions', coalesce((select jsonb_agg(x) from (select target action, path, count(*) times, count(*) filter (where kind = 'retry') retries from ev where kind in ('action', 'retry') and target is not null group by 1, 2 order by 3 desc limit 25) x), '[]'),
    -- páginas onde as pessoas ficam mais tempo (pode ser confusão ou trabalho)
    'slow_pages', coalesce((select jsonb_agg(x) from (select path, round((percentile_cont(0.5) within group (order by ms) / 1000.0)::numeric) median_s, count(*) visits from ev where kind = 'leave' and ms > 0 group by path having count(*) >= 3 order by 2 desc limit 10) x), '[]'),
    -- cada pessoa: quanto usa, o que mais abre, erros e mudanças
    'people', coalesce((select jsonb_agg(x order by x.last_at desc nulls last) from (
      select p.id, p.name, p.email, p.role,
        (select max(at) from ev where ev.user_id = p.id) last_at,
        (select count(distinct session) from ev where ev.user_id = p.id) sessions,
        (select count(*) from ev where ev.user_id = p.id and kind = 'page_view') views,
        (select count(*) from ev where ev.user_id = p.id and kind in ('action', 'retry')) actions,
        (select count(*) from ev where ev.user_id = p.id and kind = 'error') errors,
        (select count(*) from au where au.user_id = p.id) changes,
        (select path from ev where ev.user_id = p.id and kind = 'page_view' group by path order by count(*) desc limit 1) top_page
      from public.profiles p) x), '[]'),
    'changes', coalesce((select jsonb_agg(x) from (select a.at, a.via, a.table_name, a.row_id, a.action, a.title, a.diff, p.name person from au a left join public.profiles p on p.id = a.user_id order by a.at desc limit 50) x), '[]'),
    'changes_by_person', coalesce((select jsonb_agg(x) from (select coalesce(p.name, a.via) person, count(*) changes from au a left join public.profiles p on p.id = a.user_id group by 1 order by 2 desc) x), '[]')
  )
$$;
revoke all on function public.xlide_audit_report(int) from public, anon, authenticated;
grant execute on function public.xlide_audit_report(int) to service_role;

-- Linha do tempo: uso (páginas, ações, buscas, erros) + mudanças (decks, boards, programas, arquivos), mais novo primeiro.
create or replace function public.xlide_audit_feed(days int default 7, person uuid default null, lim int default 300) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.at desc), '[]') from (
    (select e.at, 'use' src, e.kind, e.path, e.target, e.ms, null::text via, e.session, p.name person, e.user_id
       from public.xlide_events e left join public.profiles p on p.id = e.user_id
      where e.at > now() - make_interval(days => days) and (person is null or e.user_id = person)
      order by e.at desc limit lim)
    union all
    (select a.at, 'change', a.action, a.table_name, coalesce(a.title, a.row_id), null, a.via, null, p.name, a.user_id
       from public.xlide_audit a left join public.profiles p on p.id = a.user_id
      where a.at > now() - make_interval(days => days) and (person is null or a.user_id = person)
      order by a.at desc limit lim)
    order by 1 desc limit lim
  ) x
$$;
revoke all on function public.xlide_audit_feed(int, uuid, int) from public, anon, authenticated;
grant execute on function public.xlide_audit_feed(int, uuid, int) to service_role;
