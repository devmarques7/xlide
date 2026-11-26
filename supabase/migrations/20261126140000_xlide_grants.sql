-- Projetos novos do Supabase não dão permissão de tabela ao "authenticated": sem isso o app logado
-- recebe "permission denied" em tudo. O acesso fino continua nas políticas (RLS) de cada tabela.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.xlide_decks, public.xlide_boards, public.xlide_files,
  public.xlide_programs, public.xlide_kv, public.xlide_runs to authenticated;
grant select, update, delete on public.profiles to authenticated;
grant select on public.xlide_audit, public.xlide_events, public.xlide_migration_log, public.xlide_invites, public.xlide_tokens to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
