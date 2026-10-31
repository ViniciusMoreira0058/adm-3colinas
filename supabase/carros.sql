-- =====================================================================
-- ADM 3COLINAS · Carros: link para o dono cadastrar o próprio veículo
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
--
-- Quem abre o link não tem login. Ele só consegue chamar esta função, que:
--   1) confere o código do link (token) salvo em config/carros-<top>;
--   2) aceita só os campos do formulário, com tamanho limitado;
--   3) grava o carro em config/carlink-<top>-<id>, que a ADM vê na página Carros.
-- Ninguém sem login consegue ler nada do banco por aqui.
-- =====================================================================
create or replace function public.adm_carro_enviar(p_top text, p_token text, p_carro jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  ok text; n int; novo text; c jsonb := coalesce(p_carro, '{}'::jsonb);
  t  text := left(coalesce(p_top, ''), 40);
  tx text := left(coalesce(p_token, ''), 40);
  campo text; foto text; placa text;
begin
  if t !~ '^[a-z0-9_-]+$' or length(tx) < 8 then raise exception 'Link inválido'; end if;
  select data->>'token' into ok from public.adm_docs where col = 'config' and id = 'carros-' || t;
  if ok is null or ok = '' or ok <> tx then raise exception 'Link inválido ou vencido. Peça um link novo para a equipe ADM.'; end if;
  select count(*) into n from public.adm_docs where col = 'config' and id like 'carlink-' || t || '-%';
  if n >= 400 then raise exception 'Limite de cadastros por link atingido'; end if;
  if length(trim(coalesce(c->>'nome', ''))) < 2 or length(trim(coalesce(c->>'placa', ''))) < 7 then raise exception 'Preencha o nome e a placa'; end if;
  foto  := coalesce(c->>'foto', '');      if foto  <> '' and (foto  !~ '^data:image/jpeg;base64,' or length(foto)  > 400000) then foto  := ''; end if;
  placa := coalesce(c->>'fotoPlaca', ''); if placa <> '' and (placa !~ '^data:image/jpeg;base64,' or length(placa) > 400000) then placa := ''; end if;
  novo := 'carlink-' || t || '-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.adm_docs (col, id, data) values ('config', novo, jsonb_build_object(
    'top', t, 'origem', 'link', 'conferido', false, 'em', now(),
    'nome',   left(trim(coalesce(c->>'nome', '')), 80),
    'tel',    left(trim(coalesce(c->>'tel', '')), 30),
    'funcao', left(trim(coalesce(c->>'funcao', '')), 40),
    'placa',  left(upper(trim(coalesce(c->>'placa', ''))), 10),
    'modelo', left(trim(coalesce(c->>'modelo', '')), 60),
    'cor',    left(trim(coalesce(c->>'cor', '')), 30),
    'vagas',  case when coalesce(c->>'vagas', '') ~ '^\d{1,2}$' then (c->>'vagas')::int else null end,
    'obs',    left(trim(coalesce(c->>'obs', '')), 300),
    'foto', foto, 'fotoPlaca', placa));
  return novo;
end $$;
revoke all on function public.adm_carro_enviar(text, text, jsonb) from public;
grant execute on function public.adm_carro_enviar(text, text, jsonb) to anon, authenticated;
