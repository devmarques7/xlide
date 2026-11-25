-- XLIDE v2 · ao vivo e listas compartilhadas da equipe.
-- xlide_kv: listas que o v2 guarda inteiras (decks do editor novo, agenda, visuais das músicas, trilha, setlist, testes, imagens).
-- xlide_runs: o estado do culto ao vivo (carimbos de tempo, versão), com Realtime.
create table if not exists public.xlide_kv (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  version bigint not null default 0,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.xlide_runs (
  id text primary key default 'main',
  program_id text references public.xlide_programs (id) on delete set null,
  state jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['xlide_kv', 'xlide_runs'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

alter table public.xlide_kv enable row level security;
alter table public.xlide_runs enable row level security;
drop policy if exists "equipe" on public.xlide_kv;
create policy "equipe" on public.xlide_kv for all to authenticated using (true) with check (true);
drop policy if exists "equipe" on public.xlide_runs;
create policy "equipe" on public.xlide_runs for all to authenticated using (true) with check (true);

-- Página pública (sem login): só o programa no ao vivo, só os itens públicos, e o estado do culto.
create or replace function public.xlide_live_public() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'program', (select jsonb_build_object('id', p.id, 'title', p.title, 'service_date', p.service_date, 'starts_at', p.starts_at, 'target_min', p.target_min,
                 'doc', jsonb_build_object('date', p.doc->'date', 'short', p.doc->'short', 'transition', p.doc->'transition',
                   'items', coalesce((select jsonb_agg(i) from jsonb_array_elements(p.doc->'items') i where coalesce((i->>'public')::boolean, true)), '[]'::jsonb)))
                from public.xlide_programs p where p.is_live order by p.updated_at desc limit 1),
    'run', (select jsonb_build_object('state', r.state, 'version', r.version) from public.xlide_runs r where r.id = 'main'),
    'songs', coalesce((select jsonb_object_agg(d.id, jsonb_build_object('title', d.doc->'title', 'languages', d.doc->'languages', 'slides', d.doc->'slides', 'music', d.doc->'music'))
                from public.xlide_decks d where d.id in (select i->>'song' from public.xlide_programs p, jsonb_array_elements(p.doc->'items') i where p.is_live)), '{}'::jsonb),
    'server_time', (extract(epoch from now()) * 1000)::bigint
  )
$$;
revoke all on function public.xlide_live_public() from public;
grant execute on function public.xlide_live_public() to anon, authenticated, service_role;

-- Relógio do servidor (corrige o relógio de cada aparelho).
create or replace function public.xlide_server_time() returns bigint language sql stable as $$ select (extract(epoch from now()) * 1000)::bigint $$;
grant execute on function public.xlide_server_time() to anon, authenticated;

-- Realtime: mudanças nas listas, programas, arquivos e no culto chegam na hora em todas as telas.
do $$ declare t text; begin
  foreach t in array array['xlide_kv', 'xlide_runs', 'xlide_programs', 'xlide_files', 'xlide_decks', 'xlide_boards'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
