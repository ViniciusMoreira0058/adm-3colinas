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
-- Ações de captação: link de presença (acao.html)
-- Confere o código da ação (token) guardado na lista config/acao-<top>-<membro>
-- e grava a confirmação em config/acaopres-<top>-<ação>-<id>.
-- =====================================================================
create or replace function public.adm_acao_confirmar(p_top text, p_acao text, p_token text, p_pessoa jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  ok boolean; n int; novo text; c jsonb := coalesce(p_pessoa, '{}'::jsonb);
  t  text := left(coalesce(p_top, ''), 40);
  a  text := left(coalesce(p_acao, ''), 40);
  tx text := left(coalesce(p_token, ''), 40);
begin
  if t !~ '^[a-z0-9_-]+$' or a !~ '^[a-z0-9_-]+$' or length(tx) < 8 then raise exception 'Link inválido'; end if;
  select exists (select 1 from public.adm_docs d, jsonb_array_elements(coalesce(d.data->'lista', '[]'::jsonb)) x(v)
                 where d.col = 'config' and d.id like 'acao-' || t || '-%' and x.v->>'id' = a and x.v->>'token' = tx) into ok;
  if not ok then raise exception 'Link inválido ou a ação foi excluída. Peça um link novo para o coordenador.'; end if;
  select count(*) into n from public.adm_docs where col = 'config' and id like 'acaopres-' || t || '-' || a || '-%';
  if n >= 300 then raise exception 'Limite de confirmações atingido'; end if;
  if length(trim(coalesce(c->>'nome', ''))) < 2 then raise exception 'Coloque o seu nome'; end if;
  novo := 'acaopres-' || t || '-' || a || '-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.adm_docs (col, id, data) values ('config', novo, jsonb_build_object(
    'top', t, 'acao', a, 'em', now(),
    'nome',   left(trim(coalesce(c->>'nome', '')), 80),
    'equipe', left(trim(coalesce(c->>'equipe', '')), 40),
    'tel',    left(trim(coalesce(c->>'tel', '')), 30)));
  return novo;
end $$;
revoke all on function public.adm_acao_confirmar(text, text, text, jsonb) from public;
grant execute on function public.adm_acao_confirmar(text, text, text, jsonb) to anon, authenticated;
