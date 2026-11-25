-- Funções de trigger não são chamáveis pela API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.xlide_audit_row() from public, anon, authenticated;
revoke execute on function public.xlide_audit_files() from public, anon, authenticated;
revoke execute on function public.xlide_guard_role() from public, anon, authenticated;
revoke execute on function public.xlide_is_admin() from public, anon;
grant execute on function public.xlide_is_admin() to authenticated;
alter function public.touch_updated_at() set search_path = public;
alter function public.xlide_server_time() set search_path = public;
-- registro da migração: só a chave de serviço (script) escreve; a equipe lê
drop policy if exists "equipe lê" on public.xlide_migration_log;
create policy "equipe lê" on public.xlide_migration_log for select to authenticated using (true);
