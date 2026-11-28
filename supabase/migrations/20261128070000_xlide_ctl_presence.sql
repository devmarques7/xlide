-- Controles do ao vivo: quem está com o controle (presença) e o admin tirando um controle (broadcast "kick").
-- Canal privado "xlide-ctl": membros da equipe veem; quem pode operar o ao vivo (admin, editor, operator) entra e fala.
create policy "xlide-ctl: ver" on realtime.messages for select to authenticated
  using (realtime.topic() = 'xlide-ctl' and public.xlide_is_member());
create policy "xlide-ctl: entrar" on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'xlide-ctl' and public.xlide_can('live'));
