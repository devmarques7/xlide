-- XLIDE v2 · sistema fechado: só entra quem foi convidado.
-- 1. Convite único (xlide_invites): o admin registra o e-mail e o papel; o link leva um token que vale uma vez e expira.
--    Sem convite pendente para o e-mail, o Supabase nem cria a conta (gatilho antes do insert em auth.users).
-- 2. Membro = quem tem linha em profiles. Toda tabela exige membro (políticas restritivas); escrever exige papel.
-- 3. Cada membro ganha automaticamente a sua chave do MCP (xlide_tokens), que pode trocar quando quiser.
-- 4. Mudanças feitas pelo MCP ficam no nome de quem é dono da chave (cabeçalho x-xlide-user, só da chave de serviço).

create extension if not exists pgcrypto with schema extensions;

-- ---------- papéis ----------
create or replace function public.xlide_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.xlide_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;
-- edit = cria e muda conteúdo (decks, boards, arquivos) · live = opera o culto (programa, execução, listas do v2)
create or replace function public.xlide_can(what text) returns boolean
language sql stable security definer set search_path = public as $$
  select case what
    when 'edit' then coalesce(public.xlide_role() in ('admin', 'editor'), false)
    when 'live' then coalesce(public.xlide_role() in ('admin', 'editor', 'operator'), false)
    else public.xlide_is_member() end
$$;
revoke all on function public.xlide_role(), public.xlide_is_member(), public.xlide_can(text) from public, anon;
grant execute on function public.xlide_role(), public.xlide_is_member(), public.xlide_can(text) to authenticated, service_role;

-- ---------- convites ----------
create table if not exists public.xlide_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  email text not null check (email = lower(email) and position('@' in email) > 1),
  name text,
  role text not null default 'editor' check (role in ('admin', 'editor', 'operator', 'reader')),
  area text check (area in ('music', 'sound', 'comms', 'pulpit')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz
);
-- um convite pendente por e-mail
create unique index if not exists xlide_invites_pending on public.xlide_invites (email) where used_at is null and revoked_at is null;
alter table public.xlide_invites enable row level security;
drop policy if exists "convites: admin lê" on public.xlide_invites;
create policy "convites: admin lê" on public.xlide_invites for select to authenticated using (public.xlide_is_admin());
-- criar e cancelar só pelas funções abaixo

-- ---------- chave do MCP por pessoa ----------
create table if not exists public.xlide_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token text not null unique default 'xl_' || encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.xlide_tokens enable row level security;
drop policy if exists "chave: só a própria pessoa" on public.xlide_tokens;
create policy "chave: só a própria pessoa" on public.xlide_tokens for select to authenticated using (user_id = auth.uid());

-- ---------- entrar pelo convite ----------
-- Usa o convite pendente do e-mail (ou o do token, se o e-mail bater): cria o perfil com o papel do convite,
-- gera a chave do MCP e marca o convite como usado. Devolve true se a pessoa virou (ou já era) membro.
create or replace function public.xlide_accept_invite(uid uuid, mail text, meta jsonb, tok text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare inv public.xlide_invites;
begin
  if exists (select 1 from public.profiles where id = uid) then return true; end if;
  select * into inv from public.xlide_invites
   where email = lower(mail) and used_at is null and revoked_at is null and expires_at > now()
     and (tok is null or token = tok)
   order by created_at desc limit 1;
  if inv.id is null then return false; end if;
  insert into public.profiles (id, email, name, avatar_url, role, area)
  values (uid, lower(mail), coalesce(meta->>'full_name', meta->>'name', inv.name), meta->>'avatar_url', inv.role, inv.area)
  on conflict (id) do nothing;
  insert into public.xlide_tokens (user_id) values (uid) on conflict (user_id) do nothing;
  update public.xlide_invites set used_at = now(), used_by = uid where id = inv.id;
  return true;
end $$;
revoke all on function public.xlide_accept_invite(uuid, text, jsonb, text) from public, anon, authenticated;

-- Conta nova no Supabase: só com convite pendente para o e-mail.
create or replace function public.xlide_gate_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or not exists (
    select 1 from public.xlide_invites where email = lower(new.email) and used_at is null and revoked_at is null and expires_at > now()
  ) then
    raise exception 'xlide_sem_convite' using hint = 'O XLIDE é só por convite.';
  end if;
  return new;
end $$;
drop trigger if exists xlide_gate_signup on auth.users;
create trigger xlide_gate_signup before insert on auth.users for each row execute function public.xlide_gate_signup();

-- Perfil criado no primeiro login, a partir do convite (substitui "primeira pessoa vira admin").
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.xlide_accept_invite(new.id, new.email, coalesce(new.raw_user_meta_data, '{}'::jsonb), null);
  return new;
end $$;

-- Conta que já existia (ex.: tirada da equipe e convidada de novo): entra pelo app.
create or replace function public.xlide_join(tok text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare u auth.users;
begin
  select * into u from auth.users where id = auth.uid();
  if u.id is null then return false; end if;
  return public.xlide_accept_invite(u.id, u.email, coalesce(u.raw_user_meta_data, '{}'::jsonb), nullif(tok, ''));
end $$;
revoke all on function public.xlide_join(text) from public, anon;
grant execute on function public.xlide_join(text) to authenticated;

-- Página do convite (sem login): para quem é e se ainda vale.
create or replace function public.xlide_invite_info(tok text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('email', i.email, 'name', i.name, 'role', i.role, 'area', i.area,
           'status', case when i.revoked_at is not null then 'revoked' when i.used_at is not null then 'used'
                          when i.expires_at <= now() then 'expired' else 'valid' end,
           'expires_at', i.expires_at)
  from public.xlide_invites i where i.token = tok
$$;
revoke all on function public.xlide_invite_info(text) from public;
grant execute on function public.xlide_invite_info(text) to anon, authenticated;

-- Admin convida: cancela o pendente do mesmo e-mail e devolve o novo (com o token).
create or replace function public.xlide_invite_create(mail text, p_role text default 'editor', p_area text default null, p_name text default null, days int default 14)
returns public.xlide_invites
language plpgsql security definer set search_path = public as $$
declare inv public.xlide_invites; m text := lower(trim(mail));
begin
  if not public.xlide_is_admin() then raise exception 'Só o admin convida'; end if;
  if exists (select 1 from public.profiles where email = m) then raise exception 'Esta pessoa já está na equipe'; end if;
  update public.xlide_invites set revoked_at = now() where email = m and used_at is null and revoked_at is null;
  insert into public.xlide_invites (email, role, area, name, created_by, expires_at)
  values (m, coalesce(p_role, 'editor'), p_area, nullif(trim(p_name), ''), auth.uid(), now() + make_interval(days => greatest(1, least(coalesce(days, 14), 60))))
  returning * into inv;
  return inv;
end $$;
create or replace function public.xlide_invite_revoke(invite uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.xlide_is_admin() then raise exception 'Só o admin cancela convites'; end if;
  update public.xlide_invites set revoked_at = now() where id = invite and used_at is null;
end $$;
revoke all on function public.xlide_invite_create(text, text, text, text, int), public.xlide_invite_revoke(uuid) from public, anon;
grant execute on function public.xlide_invite_create(text, text, text, text, int), public.xlide_invite_revoke(uuid) to authenticated;

-- Trocar a própria chave do MCP (a antiga para de valer na hora).
create or replace function public.xlide_rotate_token() returns text
language plpgsql security definer set search_path = public as $$
declare t text := 'xl_' || encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not public.xlide_is_member() then raise exception 'Só para a equipe'; end if;
  insert into public.xlide_tokens (user_id, token) values (auth.uid(), t)
  on conflict (user_id) do update set token = excluded.token, created_at = now(), last_used_at = null;
  return t;
end $$;
revoke all on function public.xlide_rotate_token() from public, anon;
grant execute on function public.xlide_rotate_token() to authenticated;

-- Admin tira a pessoa da equipe (a conta continua, mas sem perfil não vê nada; a chave do MCP cai junto).
drop policy if exists "profiles: admin apaga" on public.profiles;
create policy "profiles: admin apaga" on public.profiles for delete to authenticated using (public.xlide_is_admin() and id <> auth.uid());

-- ---------- só membros veem; escrever depende do papel ----------
do $$ declare t text; begin
  foreach t in array array['profiles', 'xlide_decks', 'xlide_boards', 'xlide_files', 'xlide_programs', 'xlide_kv', 'xlide_runs',
                           'xlide_audit', 'xlide_events', 'xlide_migration_log'] loop
    execute format('drop policy if exists "só membros" on public.%I', t);
    execute format('create policy "só membros" on public.%I as restrictive for all to authenticated using (public.xlide_is_member()) with check (public.xlide_is_member())', t);
  end loop;
  foreach t in array array['xlide_decks', 'xlide_boards', 'xlide_files'] loop
    execute format('drop policy if exists "escreve: edit ins" on public.%I', t);
    execute format('drop policy if exists "escreve: edit upd" on public.%I', t);
    execute format('drop policy if exists "escreve: edit del" on public.%I', t);
    execute format('create policy "escreve: edit ins" on public.%I as restrictive for insert to authenticated with check (public.xlide_can(''edit''))', t);
    execute format('create policy "escreve: edit upd" on public.%I as restrictive for update to authenticated using (public.xlide_can(''edit''))', t);
    execute format('create policy "escreve: edit del" on public.%I as restrictive for delete to authenticated using (public.xlide_can(''edit''))', t);
  end loop;
  foreach t in array array['xlide_programs', 'xlide_kv', 'xlide_runs'] loop
    execute format('drop policy if exists "escreve: live ins" on public.%I', t);
    execute format('drop policy if exists "escreve: live upd" on public.%I', t);
    execute format('drop policy if exists "escreve: live del" on public.%I', t);
    execute format('create policy "escreve: live ins" on public.%I as restrictive for insert to authenticated with check (public.xlide_can(''live''))', t);
    execute format('create policy "escreve: live upd" on public.%I as restrictive for update to authenticated using (public.xlide_can(''live''))', t);
    execute format('create policy "escreve: live del" on public.%I as restrictive for delete to authenticated using (public.xlide_can(''live''))', t);
  end loop;
end $$;

-- Imagens: só membros enviam, trocam e apagam (ler continua público, como os slides projetados).
drop policy if exists "xlide-media: equipe envia" on storage.objects;
create policy "xlide-media: equipe envia" on storage.objects for insert to authenticated with check (bucket_id = 'xlide-media' and public.xlide_is_member());
drop policy if exists "xlide-media: equipe troca e apaga" on storage.objects;
create policy "xlide-media: equipe troca e apaga" on storage.objects for update to authenticated using (bucket_id = 'xlide-media' and public.xlide_is_member());
drop policy if exists "xlide-media: equipe apaga" on storage.objects;
create policy "xlide-media: equipe apaga" on storage.objects for delete to authenticated using (bucket_id = 'xlide-media' and public.xlide_is_member());

-- Relatório: só pelo servidor (/api/audit confere quem é membro).
revoke execute on function public.xlide_audit_report(int) from authenticated;

-- Canal do culto ao vivo (privado): todos ouvem (a tela pública também), só quem opera fala.
drop policy if exists "xlide-live: ouvir" on realtime.messages;
create policy "xlide-live: ouvir" on realtime.messages for select to anon, authenticated using (realtime.topic() = 'xlide-live');
drop policy if exists "xlide-live: falar" on realtime.messages;
create policy "xlide-live: falar" on realtime.messages for insert to authenticated with check (realtime.topic() = 'xlide-live' and public.xlide_can('live'));

-- ---------- auditoria no nome de quem usou a chave do MCP ----------
create or replace function public.xlide_actor() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare h text;
begin
  if auth.uid() is not null then return auth.uid(); end if;
  if coalesce(auth.role(), '') <> 'service_role' then return null; end if;
  h := nullif(current_setting('request.headers', true), '')::json->>'x-xlide-user';
  if h ~ '^[0-9a-f-]{36}$' then return h::uuid; end if;
  return null;
exception when others then return null;
end $$;
revoke all on function public.xlide_actor() from public, anon, authenticated;

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
  values (public.xlide_actor(), via, tg_table_name, rid, lower(tg_op), t, d);
  return coalesce(new, old);
end $$;

create or replace function public.xlide_audit_files() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.xlide_audit (user_id, via, table_name, row_id, action, title, diff)
  values (public.xlide_actor(), case when auth.uid() is null then 'mcp' else 'app' end, 'xlide_files', coalesce(new.id, old.id), lower(tg_op), coalesce(new.name, old.name),
          case when tg_op = 'UPDATE' then jsonb_build_object('status', new.status, 'folder', new.folder) end);
  return coalesce(new, old);
end $$;

-- funções de gatilho não são chamáveis pela API
revoke execute on function public.handle_new_user(), public.xlide_gate_signup(), public.xlide_audit_row(), public.xlide_audit_files() from public, anon, authenticated;
