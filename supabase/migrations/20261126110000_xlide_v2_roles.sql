-- Primeira pessoa a entrar vira admin; as seguintes entram como editor.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, avatar_url, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url',
          case when exists (select 1 from public.profiles where role = 'admin') then 'editor' else 'admin' end)
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.xlide_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;
grant execute on function public.xlide_is_admin() to authenticated;

-- Admin muda papel e área de qualquer pessoa (Equipe e acesso).
drop policy if exists "profiles: admin edita" on public.profiles;
create policy "profiles: admin edita" on public.profiles for update to authenticated using (public.xlide_is_admin()) with check (true);
-- A própria pessoa não se promove: papel só muda pelo admin.
create or replace function public.xlide_guard_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.area is distinct from old.area) and not public.xlide_is_admin() and auth.uid() is not null then
    raise exception 'Só o admin muda papéis';
  end if;
  return new;
end $$;
drop trigger if exists guard_role on public.profiles;
create trigger guard_role before update on public.profiles for each row execute function public.xlide_guard_role();

-- Arquivos: quem recebeu acesso também salva as edições.
drop policy if exists "arquivos: dono e compartilhados" on public.xlide_files;
create policy "arquivos: dono e compartilhados" on public.xlide_files for all to authenticated
  using (owner_id = auth.uid() or auth.uid() = any (shared_with) or owner_id is null)
  with check (owner_id = auth.uid() or auth.uid() = any (shared_with) or owner_id is null);
