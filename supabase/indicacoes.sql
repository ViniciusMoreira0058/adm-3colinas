-- =====================================================================
-- ADM 3COLINAS · Indicações pelo link (indica.html)
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
--
-- Quem abre o link não tem login. Ele só consegue chamar esta função, que:
--   1) confere o código do link (token) salvo em config/indic-cfg-<top>;
--   2) aceita só os campos do formulário, com tamanho limitado;
--   3) grava a indicação em config/indlink-<top>-<id>, que a ADM vê na página Meta do TOP.
-- Ninguém sem login consegue ler nada do banco por aqui.
-- =====================================================================
create or replace function public.adm_indic_enviar(p_top text, p_token text, p_ind jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  ok text; n int; novo text; c jsonb := coalesce(p_ind, '{}'::jsonb);
  t  text := left(coalesce(p_top, ''), 40);
  tx text := left(coalesce(p_token, ''), 40);
begin
  if t !~ '^[a-z0-9_-]+$' or length(tx) < 8 then raise exception 'Link inválido'; end if;
  select data->>'token' into ok from public.adm_docs where col = 'config' and id = 'indic-cfg-' || t;
  if ok is null or ok = '' or ok <> tx then raise exception 'Link inválido ou vencido. Peça um link novo para a equipe ADM.'; end if;
  select count(*) into n from public.adm_docs where col = 'config' and id like 'indlink-' || t || '-%';
  if n >= 1500 then raise exception 'Limite de indicações por link atingido'; end if;
  if length(trim(coalesce(c->>'nome', ''))) < 2 or length(regexp_replace(coalesce(c->>'tel', ''), '\D', '', 'g')) < 10
     or length(trim(coalesce(c->>'quem', ''))) < 2 then raise exception 'Preencha o seu nome, o nome e o telefone de quem você indica'; end if;
  novo := 'indlink-' || t || '-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.adm_docs (col, id, data) values ('config', novo, jsonb_build_object(
    'top', t, 'origem', 'link', 'status', 'novo', 'canal', 'Indicação pessoal', 'em', now(),
    'nome',   left(trim(coalesce(c->>'nome', '')), 80),
    'tel',    left(trim(coalesce(c->>'tel', '')), 30),
    'quem',   left(trim(coalesce(c->>'quem', '')), 80),
    'equipe', left(trim(coalesce(c->>'equipe', '')), 40),
    'obs',    left(trim(coalesce(c->>'obs', '')), 300)));
  return novo;
end $$;
revoke all on function public.adm_indic_enviar(text, text, jsonb) from public;
grant execute on function public.adm_indic_enviar(text, text, jsonb) to anon, authenticated;

-- =====================================================================
-- Eventos (Agenda): link de presença (acao.html)
-- Confere o código da ação (token) guardado na lista config/acao-<top>-<membro>
-- e grava a confirmação em config/acaopres-<top>-<ação>-<id>.
-- =====================================================================
create or replace function public.adm_acao_status(p_top text, p_acao text, p_token text)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare ev jsonb;
begin
  select x.v into ev from public.adm_docs d, jsonb_array_elements(coalesce(d.data->'lista', '[]'::jsonb)) x(v)
    where d.col = 'config' and d.id like 'acao-' || left(coalesce(p_top, ''), 40) || '-%' and x.v->>'id' = left(coalesce(p_acao, ''), 40)
      and x.v->>'token' = left(coalesce(p_token, ''), 40) and length(coalesce(p_token, '')) >= 8 limit 1;
  if ev is null then return 'invalido'; end if;
  if coalesce(ev->>'data', '') <> '' and ev->>'data' < to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD') then return 'passou'; end if;
  if coalesce((ev->>'fechado')::boolean, false) then return 'fechado'; end if;
  return 'aberto';
end $$;
revoke all on function public.adm_acao_status(text, text, text) from public;
grant execute on function public.adm_acao_status(text, text, text) to anon, authenticated;

create or replace function public.adm_acao_confirmar(p_top text, p_acao text, p_token text, p_pessoa jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  ok boolean; vs boolean; n int; novo text; velho text; tel10 text; st text; c jsonb := coalesce(p_pessoa, '{}'::jsonb);
  t  text := left(coalesce(p_top, ''), 40);
  a  text := left(coalesce(p_acao, ''), 40);
  tx text := left(coalesce(p_token, ''), 40);
begin
  if t !~ '^[a-z0-9_-]+$' or a !~ '^[a-z0-9_-]+$' or length(tx) < 8 then raise exception 'Link inválido'; end if;
  select exists (select 1 from public.adm_docs d, jsonb_array_elements(coalesce(d.data->'lista', '[]'::jsonb)) x(v)
                 where d.col = 'config' and d.id like 'acao-' || t || '-%' and x.v->>'id' = a and x.v->>'token' = tx) into ok;
  if not ok then raise exception 'Link inválido ou a ação foi excluída. Peça um link novo para o coordenador.'; end if;
  st := public.adm_acao_status(t, a, tx);
  if st = 'passou' then raise exception 'Este evento já passou.'; end if;
  if st = 'fechado' then raise exception 'Ops! As vagas deste evento já se encerraram.'; end if;
  select count(*) into n from public.adm_docs where col = 'config' and id like 'acaopres-' || t || '-' || a || '-%';
  if n >= 300 then raise exception 'Limite de confirmações atingido'; end if;
  if length(trim(coalesce(c->>'nome', ''))) < 2 then raise exception 'Coloque o seu nome'; end if;
  tel10 := right(regexp_replace(coalesce(c->>'tel', ''), '\D', '', 'g'), 10);
  if length(tel10) < 10 then raise exception 'Coloque o seu telefone com DDD'; end if;
  -- mesmo telefone no mesmo evento: atualiza a confirmação que já existe, não cria outra
  select d.id, coalesce((d.data->>'servo')::boolean, false) into velho, vs from public.adm_docs d
    where d.col = 'config' and d.id like 'acaopres-' || t || '-' || a || '-%'
      and right(regexp_replace(coalesce(d.data->>'tel', ''), '\D', '', 'g'), 10) = tel10 limit 1;
  novo := coalesce(velho, 'acaopres-' || t || '-' || a || '-' || replace(gen_random_uuid()::text, '-', ''));
  insert into public.adm_docs (col, id, data) values ('config', novo, jsonb_build_object(
    'top', t, 'acao', a, 'em', now(),
    'nome',   left(trim(coalesce(c->>'nome', '')), 80),
    'equipe', left(trim(coalesce(c->>'equipe', '')), 40),
    'tel',    left(trim(coalesce(c->>'tel', '')), 30),
    'servo',  coalesce(c->>'servo', '') = 'true' or coalesce(vs, false),   -- quem já se inscreveu para servir continua servo
    'leg',    case when c->>'leg' = 'false' then false else true end,
    'num',    left(regexp_replace(coalesce(c->>'num', ''), '[^0-9A-Za-z./-]', '', 'g'), 12),
    'igreja', left(trim(coalesce(c->>'igreja', '')), 60),
    'info',   left(trim(coalesce(c->>'info', '')), 300)))
  on conflict (col, id) do update set data = excluded.data;
  return case when velho is null then novo else 'atualizado' end;
end $$;
revoke all on function public.adm_acao_confirmar(text, text, text, jsonb) from public;
grant execute on function public.adm_acao_confirmar(text, text, text, jsonb) to anon, authenticated;

-- =====================================================================
-- Meta do TOP e Agenda: o que o coordenador de equipe lê e grava
-- (rode depois do coordenadores.sql)
--   Lê: meta, indicações (menos o código do link), eventos e confirmações,
--       tarefas das equipes, respostas prontas e o próximo TOP planejado.
--   Grava: as próprias indicações (indic-<top>-<id dele>), os próprios eventos
--       (acao-<top>-<id dele>), as tarefas (metatar-<top>) e as respostas prontas (meta-faq).
-- =====================================================================
create or replace function public.adm_coord_config(p_id text)
returns boolean language sql immutable set search_path = ''
as $$
  select p_id in ('emerg', 'pista-mapa', 'novidade', 'aviso', 'meta-faq', 'top-previsto')
      or p_id like 'cronoplano-%' or p_id like 'pista-vivo-%' or p_id like 'consag-%'
      or p_id like 'meta-%' or p_id like 'metatar-%' or p_id like 'indlink-%'
      or (p_id like 'indic-%' and p_id not like 'indic-cfg-%')
      or p_id like 'acao-%' or p_id like 'acaopres-%' or p_id like 'sala-%'
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
revoke all on function public.adm_coord_meta_meu(text, text) from public, anon;
grant execute on function public.adm_coord_meta_meu(text, text) to authenticated;

drop policy if exists adm_docs_criar on public.adm_docs;
create policy adm_docs_criar on public.adm_docs for insert to authenticated
  with check ((public.adm_pode_gravar(col, data) and (not public.adm_doc_fin(col, id) or public.adm_fin_ok()))
              or public.adm_coord_gasto_meu(col, id, data) or public.adm_coord_meta_meu(col, id));
drop policy if exists adm_docs_alterar on public.adm_docs;
create policy adm_docs_alterar on public.adm_docs for update to authenticated
  using ((public.adm_pode_gravar(col, data) and (not public.adm_doc_fin(col, id) or public.adm_fin_ok()))
         or public.adm_coord_gasto_meu(col, id, data) or public.adm_coord_meta_meu(col, id))
  with check ((public.adm_pode_gravar(col, data) and (not public.adm_doc_fin(col, id) or public.adm_fin_ok()))
              or public.adm_coord_gasto_meu(col, id, data) or public.adm_coord_meta_meu(col, id));
