-- =====================================================================
-- ADM 3COLINAS · histórico de alterações (só o dono vê)
-- Como usar: Supabase → SQL Editor → New query → cole tudo → Run.
-- Pode rodar mais de uma vez sem quebrar. (Já está incluído no schema.sql.)
-- Guarda quem criou, alterou ou apagou cada registro, e o que mudou.
-- Registros apagados ficam guardados aqui e podem ser restaurados pelo app.
-- =====================================================================
create table if not exists public.adm_historico (
  id        bigint generated always as identity primary key,
  em        timestamptz not null default now(),
  user_id   uuid,
  quem      text not null,
  col       text not null,
  doc_id    text not null,
  acao      text not null check (acao in ('criou','alterou','apagou')),
  nome      text,
  mudancas  jsonb,          -- alterou: {campo: [antes, depois]}
  dados     jsonb           -- apagou: o registro inteiro, para restaurar
);
create index if not exists adm_historico_em_idx on public.adm_historico (em desc);

create or replace function public.adm_registrar_historico()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  quem text; dif jsonb := '{}'; k text;
  ignorar text[] := array['adm','admId','admEm','atualizado'];
  d jsonb := case when tg_op = 'DELETE' then old.data else new.data end;
begin
  select m.nome into quem from public.adm_membros m where m.user_id = auth.uid() limit 1;
  quem := coalesce(quem, case when auth.uid() is null then 'Sistema (SQL Editor)' else 'Login sem cadastro' end);
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(old.data) union select jsonb_object_keys(new.data) loop
      if not (k = any(ignorar)) and (old.data -> k) is distinct from (new.data -> k) then
        dif := dif || jsonb_build_object(k, jsonb_build_array(old.data -> k, new.data -> k));
      end if;
    end loop;
    if dif = '{}' then return null; end if;
  end if;
  insert into public.adm_historico (user_id, quem, col, doc_id, acao, nome, mudancas, dados)
  values (auth.uid(), quem, coalesce(new.col, old.col), coalesce(new.id, old.id),
          case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'alterou' else 'apagou' end,
          coalesce(d ->> 'nome', d ->> 'titulo', d ->> 'item', d ->> 'dia'),
          case when tg_op = 'UPDATE' then dif end,
          case when tg_op = 'DELETE' then old.data end);
  return null;
end $$;
revoke all on function public.adm_registrar_historico() from public, anon, authenticated;

drop trigger if exists adm_historico on public.adm_docs;
create trigger adm_historico after insert or update or delete on public.adm_docs
  for each row execute function public.adm_registrar_historico();

alter table public.adm_historico enable row level security;
drop policy if exists adm_historico_dono on public.adm_historico;
create policy adm_historico_dono on public.adm_historico for select to authenticated
  using (public.adm_eh_dono());
grant select on public.adm_historico to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'adm_historico') then
    alter publication supabase_realtime add table public.adm_historico;
  end if;
end $$;
