-- XLIDE · Brand kits (Ideias → Brand kits).
-- Um brand kit guarda a identidade de um ministério, evento ou série (ex. Cafofo): quem é, tom de voz,
-- paleta com o uso de cada cor, fontes, logos, referências, imagens, regras e o visual padrão dos slides.
-- Decks, músicas e programas apontam para ele (doc.brand_id / identity.brand_id), e o MCP lê o kit
-- antes de criar qualquer coisa, para tudo sair consistente.

create table if not exists public.xlide_brands (
  id text primary key,
  title text,
  doc jsonb not null default '{}',
  owner_id uuid references auth.users (id) on delete set null,
  source text not null default 'app',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

drop trigger if exists touch on public.xlide_brands;
create trigger touch before update on public.xlide_brands for each row execute function public.touch_updated_at();

alter table public.xlide_brands enable row level security;
drop policy if exists "equipe" on public.xlide_brands;
create policy "equipe" on public.xlide_brands for all to authenticated using (true) with check (true);
drop policy if exists "só membros" on public.xlide_brands;
create policy "só membros" on public.xlide_brands as restrictive for all to authenticated using (public.xlide_is_member()) with check (public.xlide_is_member());
drop policy if exists "escreve: edit ins" on public.xlide_brands;
drop policy if exists "escreve: edit upd" on public.xlide_brands;
drop policy if exists "escreve: edit del" on public.xlide_brands;
create policy "escreve: edit ins" on public.xlide_brands as restrictive for insert to authenticated with check (public.xlide_can('edit'));
create policy "escreve: edit upd" on public.xlide_brands as restrictive for update to authenticated using (public.xlide_can('edit'));
create policy "escreve: edit del" on public.xlide_brands as restrictive for delete to authenticated using (public.xlide_can('edit'));

grant select, insert, update, delete on public.xlide_brands to authenticated;
grant select, insert, update, delete on public.xlide_brands to service_role;

drop trigger if exists audit on public.xlide_brands;
create trigger audit after insert or update or delete on public.xlide_brands for each row execute function public.xlide_audit_row();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'xlide_brands') then
    alter publication supabase_realtime add table public.xlide_brands;
  end if;
end $$;
