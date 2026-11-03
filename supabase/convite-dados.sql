-- Convite de evento: guarda se é legendário, nº de legendário, igreja e como pode ajudar.
-- Não deixa confirmar 2 vezes: o mesmo telefone no mesmo evento só atualiza os dados.
-- Evento que já passou ou com as inscrições encerradas pela ADM (a.fechado) não aceita confirmação.
-- Pode rodar sozinho no SQL Editor do Supabase (substitui só a função adm_acao_confirmar).
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
  ok boolean; n int; novo text; velho text; tel10 text; st text; c jsonb := coalesce(p_pessoa, '{}'::jsonb);
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
  select d.id into velho from public.adm_docs d
    where d.col = 'config' and d.id like 'acaopres-' || t || '-' || a || '-%'
      and right(regexp_replace(coalesce(d.data->>'tel', ''), '\D', '', 'g'), 10) = tel10 limit 1;
  novo := coalesce(velho, 'acaopres-' || t || '-' || a || '-' || replace(gen_random_uuid()::text, '-', ''));
  insert into public.adm_docs (col, id, data) values ('config', novo, jsonb_build_object(
    'top', t, 'acao', a, 'em', now(),
    'nome',   left(trim(coalesce(c->>'nome', '')), 80),
    'equipe', left(trim(coalesce(c->>'equipe', '')), 40),
    'tel',    left(trim(coalesce(c->>'tel', '')), 30),
    'leg',    case when c->>'leg' = 'false' then false else true end,
    'num',    left(regexp_replace(coalesce(c->>'num', ''), '[^0-9A-Za-z./-]', '', 'g'), 12),
    'igreja', left(trim(coalesce(c->>'igreja', '')), 60),
    'info',   left(trim(coalesce(c->>'info', '')), 300)))
  on conflict (col, id) do update set data = excluded.data;
  return case when velho is null then novo else 'atualizado' end;
end $$;
revoke all on function public.adm_acao_confirmar(text, text, text, jsonb) from public;
grant execute on function public.adm_acao_confirmar(text, text, text, jsonb) to anon, authenticated;

-- Link curto do convite (adm-3colinas.vercel.app/c/<token> ou /c/<token>-<nº da equipe>):
-- devolve só o que a página de confirmação mostra (título, data, local, equipes e missões). Nada de confirmados.
create or replace function public.adm_acao_link(p_code text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare tk text := split_part(left(coalesce(p_code, ''), 60), '-', 1); r jsonb;
begin
  if length(tk) < 8 or tk !~ '^[a-z0-9]+$' then return null; end if;
  select jsonb_build_object('top', substring(d.id from '^acao-([^-]+)-'), 'a', x.v->>'id', 't', tk,
           'ev', jsonb_build_object('titulo', x.v->'titulo', 'data', x.v->'data', 'hora', x.v->'hora', 'local', x.v->'local',
                                    'endereco', x.v->'endereco', 'equipe', x.v->'equipe', 'aberto', x.v->'aberto', 'resp', x.v->'resp'))
    into r from public.adm_docs d, jsonb_array_elements(coalesce(d.data->'lista', '[]'::jsonb)) x(v)
    where d.col = 'config' and d.id like 'acao-%' and x.v->>'token' = tk limit 1;
  return r;
end $$;
revoke all on function public.adm_acao_link(text) from public;
grant execute on function public.adm_acao_link(text) to anon, authenticated;
