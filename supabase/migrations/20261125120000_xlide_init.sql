-- XLIDE v2 · base no Supabase (projeto só do XLIDE).
-- Guarda os decks e boards como estão hoje (o JSON inteiro em doc), sem refatorar o editor,
-- mais os arquivos do usuário, os programas do culto e as imagens (Storage).
-- Os dados do Redis são COPIADOS para cá por scripts/migrate-redis-to-supabase.mjs; o Redis fica intacto.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  role text not null default 'editor' check (role in ('admin', 'editor', 'operator', 'reader')),
  area text check (area in ('music', 'sound', 'comms', 'pulpit')),
  created_at timestamptz not null default now()
);

-- Perfil criado no primeiro login com o Google.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Decks e músicas (Presentation do XLIDE inteiro em doc).
create table if not exists public.xlide_decks (
  id text primary key,
  kind text not null default 'deck' check (kind in ('deck', 'song')),
  title text,
  doc jsonb not null,
  owner_id uuid references auth.users (id) on delete set null,
  source text not null default 'app', -- 'redis' quando veio da migração
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Boards (mapa mental, moodboard, quadro).
create table if not exists public.xlide_boards (
  id text primary key,
  title text,
  doc jsonb not null,
  owner_id uuid references auth.users (id) on delete set null,
  source text not null default 'app',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Meus arquivos: pastas, padrão, arquivados, lixeira (como no mockup v2).
create table if not exists public.xlide_files (
  id text primary key,
  name text not null,
  folder text not null default 'avisos' check (folder in ('avisos', 'pregacao', 'inicio', 'oracao', 'versiculo')),
  status text not null default 'ativo' check (status in ('ativo', 'padrao', 'arquivado', 'lixeira')),
  starred boolean not null default false,
  deck_id text references public.xlide_decks (id) on delete set null,
  doc jsonb not null default '{}'::jsonb,
  owner_id uuid references auth.users (id) on delete set null,
  shared_with uuid[] not null default '{}',
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Programas do culto (Programa Estúdio): rascunho, salvo, já feito, arquivado, lixeira.
create table if not exists public.xlide_programs (
  id text primary key,
  title text not null,
  service_date date,
  starts_at time,
  target_min int,
  status text not null default 'rascunho' check (status in ('rascunho', 'salvo', 'feito', 'arquivado', 'lixeira')),
  is_live boolean not null default false,
  doc jsonb not null default '{}'::jsonb, -- itens, trilha, transição, arquivados e lixeira do programa
  owner_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Registro da migração do Redis (o que foi copiado e quando).
create table if not exists public.xlide_migration_log (
  id bigserial primary key,
  kind text not null,
  ref text not null,
  ok boolean not null,
  note text,
  at timestamptz not null default now()
);

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['xlide_decks', 'xlide_boards', 'xlide_files', 'xlide_programs'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- RLS: a equipe logada lê e escreve; anon não lê nada.
-- (Papéis por área entram depois, com as tabelas live_*; por enquanto, um time só.)
alter table public.profiles enable row level security;
alter table public.xlide_decks enable row level security;
alter table public.xlide_boards enable row level security;
alter table public.xlide_files enable row level security;
alter table public.xlide_programs enable row level security;
alter table public.xlide_migration_log enable row level security;

drop policy if exists "profiles: equipe lê" on public.profiles;
create policy "profiles: equipe lê" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles: a própria pessoa edita" on public.profiles;
create policy "profiles: a própria pessoa edita" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

do $$ declare t text; begin
  foreach t in array array['xlide_decks', 'xlide_boards', 'xlide_programs'] loop
    execute format('drop policy if exists "equipe" on public.%I', t);
    execute format('create policy "equipe" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Arquivos: o dono e quem recebeu acesso.
drop policy if exists "arquivos: dono e compartilhados" on public.xlide_files;
create policy "arquivos: dono e compartilhados" on public.xlide_files for all to authenticated
  using (owner_id = auth.uid() or auth.uid() = any (shared_with) or owner_id is null)
  with check (owner_id = auth.uid() or owner_id is null);

-- Storage: imagens e mídia dos slides.
insert into storage.buckets (id, name, public) values ('xlide-media', 'xlide-media', true)
on conflict (id) do nothing;
drop policy if exists "xlide-media: equipe envia" on storage.objects;
create policy "xlide-media: equipe envia" on storage.objects for insert to authenticated with check (bucket_id = 'xlide-media');
drop policy if exists "xlide-media: equipe troca e apaga" on storage.objects;
create policy "xlide-media: equipe troca e apaga" on storage.objects for update to authenticated using (bucket_id = 'xlide-media');
drop policy if exists "xlide-media: equipe apaga" on storage.objects;
create policy "xlide-media: equipe apaga" on storage.objects for delete to authenticated using (bucket_id = 'xlide-media');
