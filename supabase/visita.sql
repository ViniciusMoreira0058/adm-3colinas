-- Visita técnica: cada pessoa (ADM ou coordenador, até quem é "somente leitura") grava só as próprias anotações
-- no documento config/visita-<top>-<id do cadastro>. Todos leem as anotações de todos.
-- Rode depois do coordenadores.sql. Pode rodar mais de uma vez.
create or replace function public.adm_coord_config(p_id text)
returns boolean language sql immutable set search_path = ''
as $$
  select p_id in ('emerg', 'pista-mapa', 'novidade', 'aviso', 'meta-faq', 'top-previsto')
      or p_id like 'cronoplano-%' or p_id like 'pista-vivo-%' or p_id like 'consag-%'
      or p_id like 'meta-%' or p_id like 'metatar-%' or p_id like 'indlink-%'
      or (p_id like 'indic-%' and p_id not like 'indic-cfg-%')
      or p_id like 'acao-%' or p_id like 'acaopres-%' or p_id like 'sala-%'
      or p_id like 'visita-%'
$$;

create or replace function public.adm_coord_meta_meu(p_col text, p_id text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare m public.adm_membros := public.adm_eu();
begin
  return m.id is not null and m.perfil = 'coord' and p_col = 'config'
     and (p_id = 'meta-faq' or p_id like 'metatar-%' or p_id like 'sala-%'
          or (p_id like 'indic-%-' || m.id::text and p_id not like 'indic-cfg-%')
          or (p_id like 'acao-%-' || m.id::text and p_id not like 'acaopres-%'));
end $$;

create or replace function public.adm_visita_meu(p_col text, p_id text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare m public.adm_membros := public.adm_eu();
begin
  return m.id is not null and p_col = 'config' and p_id like 'visita-%-' || m.id::text;
end $$;
revoke all on function public.adm_coord_meta_meu(text, text), public.adm_visita_meu(text, text) from public, anon;
grant execute on function public.adm_coord_meta_meu(text, text), public.adm_visita_meu(text, text) to authenticated;

drop policy if exists adm_docs_criar on public.adm_docs;
create policy adm_docs_criar on public.adm_docs for insert to authenticated
  with check ((public.adm_pode_gravar(col, data) and (not public.adm_doc_fin(col, id) or public.adm_fin_ok()))
              or public.adm_coord_gasto_meu(col, id, data) or public.adm_coord_meta_meu(col, id) or public.adm_visita_meu(col, id));
drop policy if exists adm_docs_alterar on public.adm_docs;
create policy adm_docs_alterar on public.adm_docs for update to authenticated
  using ((public.adm_pode_gravar(col, data) and (not public.adm_doc_fin(col, id) or public.adm_fin_ok()))
         or public.adm_coord_gasto_meu(col, id, data) or public.adm_coord_meta_meu(col, id) or public.adm_visita_meu(col, id))
  with check ((public.adm_pode_gravar(col, data) and (not public.adm_doc_fin(col, id) or public.adm_fin_ok()))
              or public.adm_coord_gasto_meu(col, id, data) or public.adm_coord_meta_meu(col, id) or public.adm_visita_meu(col, id));
