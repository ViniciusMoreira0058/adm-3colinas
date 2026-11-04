-- ADM 3COLINAS · tudo o que falta rodar em 04/11/2026, na ordem certa: convite (evento GRATUITO) → Feed 3Colinas (+ aviso de inscrição) → limpeza do Histórico (90 dias)
-- Pode rodar de novo sem problema.

-- ===== 1/3 convite-dados.sql =====
-- Convite de evento: guarda se é legendário, nº de legendário, igreja e como pode ajudar.
-- Quem entra pelo link da equipe é servo (servo=true) e já participa; se depois confirmar como participante, continua servo.
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
                                    'endereco', x.v->'endereco', 'equipe', x.v->'equipe', 'aberto', x.v->'aberto', 'resp', x.v->'resp', 'gratis', x.v->'gratis'))
    into r from public.adm_docs d, jsonb_array_elements(coalesce(d.data->'lista', '[]'::jsonb)) x(v)
    where d.col = 'config' and d.id like 'acao-%' and x.v->>'token' = tk limit 1;
  return r;
end $$;
revoke all on function public.adm_acao_link(text) from public;
grant execute on function public.adm_acao_link(text) to anon, authenticated;

-- ===== 2/3 feed.sql =====
-- ADM 3COLINAS · Feed do TOP: todo mundo do app (ADM ou coordenador, até quem é "somente leitura") posta, curte e comenta.
-- Cada pessoa grava só o que é dela: os posts config/post-<top>-<id do cadastro>-<n> e a atividade config/feedeu-<top>-<id do cadastro>.
-- A foto vai para o Storage (adm-fotos, pasta feed/). Quem é marcado (@) recebe aviso no celular.
-- Rode depois do visita.sql e do avisos-inscricao.sql (este já traz o aviso de inscrição junto). Pode rodar de novo.

create or replace function public.adm_coord_config(p_id text)
returns boolean language sql immutable set search_path = ''
as $$
  select p_id in ('emerg', 'pista-mapa', 'novidade', 'aviso', 'meta-faq', 'top-previsto')
      or p_id like 'cronoplano-%' or p_id like 'pista-vivo-%' or p_id like 'consag-%'
      or p_id like 'meta-%' or p_id like 'metatar-%' or p_id like 'indlink-%'
      or (p_id like 'indic-%' and p_id not like 'indic-cfg-%')
      or p_id like 'acao-%' or p_id like 'acaopres-%' or p_id like 'sala-%'
      or p_id like 'visita-%' or p_id like 'post-%' or p_id like 'feedeu-%'
$$;

create or replace function public.adm_feed_meu(p_col text, p_id text, p_data jsonb)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare m public.adm_membros := public.adm_eu();
begin
  return m.id is not null and p_col = 'config'
     and ((p_id like 'post-%-' || m.id::text || '-%' and p_data->>'porId' = m.id::text)
          or p_id like 'feedeu-%-' || m.id::text);
end $$;
revoke all on function public.adm_feed_meu(text, text, jsonb) from public, anon;
grant execute on function public.adm_feed_meu(text, text, jsonb) to authenticated;

drop policy if exists adm_docs_criar on public.adm_docs;
create policy adm_docs_criar on public.adm_docs for insert to authenticated
  with check ((public.adm_pode_gravar(col, data) and (not public.adm_doc_fin(col, id) or public.adm_fin_ok()))
              or public.adm_coord_gasto_meu(col, id, data) or public.adm_coord_meta_meu(col, id) or public.adm_visita_meu(col, id)
              or public.adm_feed_meu(col, id, data));
drop policy if exists adm_docs_alterar on public.adm_docs;
create policy adm_docs_alterar on public.adm_docs for update to authenticated
  using ((public.adm_pode_gravar(col, data) and (not public.adm_doc_fin(col, id) or public.adm_fin_ok()))
         or public.adm_coord_gasto_meu(col, id, data) or public.adm_coord_meta_meu(col, id) or public.adm_visita_meu(col, id)
         or public.adm_feed_meu(col, id, data))
  with check ((public.adm_pode_gravar(col, data) and (not public.adm_doc_fin(col, id) or public.adm_fin_ok()))
              or public.adm_coord_gasto_meu(col, id, data) or public.adm_coord_meta_meu(col, id) or public.adm_visita_meu(col, id)
              or public.adm_feed_meu(col, id, data));

-- fotos do feed: todos leem; cada um envia na própria pasta feed/<top>/<id do cadastro>/
drop policy if exists adm_fotos_ler on storage.objects;
create policy adm_fotos_ler on storage.objects for select to authenticated
  using (bucket_id = 'adm-fotos' and (public.adm_eu()).id is not null
         and (case when name like 'feed/%' then true
                   when coalesce((public.adm_eu()).perfil, 'adm') = 'coord'
                   then name like 'gastos/%/' || (public.adm_eu()).id::text || '/%'
                   when name like 'financeiro/%' or name like 'gastos/%' then public.adm_fin_ok()
                   else true end));
drop policy if exists adm_fotos_feed on storage.objects;
create policy adm_fotos_feed on storage.objects for insert to authenticated
  with check (bucket_id = 'adm-fotos' and (public.adm_eu()).id is not null
              and name like 'feed/%/' || (public.adm_eu()).id::text || '/%');

-- avisos no celular: tudo o que já existia + quem foi marcado no feed (curtidas e posts sem marcação não avisam ninguém)
create or replace function public.adm_push_disparar()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_cfg public.adm_push_cfg; v_ator public.adm_membros; v_tipo text; v_subs jsonb; v_extra int := 0; v_ult timestamptz; v_novo jsonb := new.data; v_ev jsonb;
  v_men jsonb; v_txt text;
begin
  select * into v_cfg from public.adm_push_cfg where id = 1;
  if v_cfg.url is null or v_cfg.vapid_private is null or v_cfg.vapid_private like 'COLE_%' then return null; end if;
  if tg_op = 'UPDATE' and old.data = new.data then return null; end if;
  select * into v_ator from public.adm_membros where user_id = auth.uid() limit 1;

  if new.col = 'config' and new.id like 'comvisto-%' then return null; end if;   -- "vi" no recado: não avisa ninguém
  if new.col = 'config' and (new.id like 'post-%' or new.id like 'feedeu-%') then
    -- feed: só avisa quem foi marcado, no post novo ou no comentário novo
    if new.id like 'post-%' then
      if tg_op <> 'INSERT' then return null; end if;
      v_men := coalesce(new.data -> 'men', '[]'::jsonb); v_txt := coalesce(new.data ->> 'txt', '');
      v_novo := jsonb_build_object('title', coalesce(new.data ->> 'por', 'Alguém') || ' marcou você no Feed do TOP',
        'body', case when v_txt = '' then 'Numa foto.' else left(v_txt, 200) end, 'tag', 'adm3-feed-' || new.id);
    else
      if (new.data #>> '{coms,-1,id}') is null
         or (tg_op = 'UPDATE' and (new.data #>> '{coms,-1,id}') is not distinct from (old.data #>> '{coms,-1,id}')) then return null; end if;
      v_men := coalesce(new.data #> '{coms,-1,men}', '[]'::jsonb);
      v_novo := jsonb_build_object('title', coalesce(new.data ->> 'por', 'Alguém') || ' marcou você num comentário',
        'body', left(coalesce(new.data #>> '{coms,-1,txt}', ''), 200), 'tag', 'adm3-feedc-' || (new.data #>> '{coms,-1,id}'));
    end if;
    if jsonb_array_length(v_men) = 0 then return null; end if;
    v_tipo := 'direto';
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]') into v_subs
      from public.adm_push s join public.adm_membros m on m.user_id = s.user_id
      where m.ativo and v_men ? m.id::text and s.user_id is distinct from auth.uid();
  elsif new.col = 'config' and new.id like 'mural-%' then
    -- recado novo na Comunicação: todos os ADMs ativos, menos quem mandou (fixar/desafixar não avisa)
    if tg_op = 'UPDATE' and (new.data #>> '{msgs,0,id}') is not distinct from (old.data #>> '{msgs,0,id}') then return null; end if;
    v_tipo := 'mural';
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]') into v_subs
      from public.adm_push s join public.adm_membros m on m.user_id = s.user_id
      where m.ativo and s.user_id is distinct from auth.uid();
  elsif new.col = 'config' and new.id like 'acaopres-%' then
    -- alguém confirmou num evento pelo link: avisa os coordenadores da equipe dele (só na primeira confirmação, não quando atualiza)
    if tg_op <> 'INSERT' or coalesce(new.data ->> 'equipe', '') = '' then return null; end if;
    select x.v into v_ev from public.adm_docs d, jsonb_array_elements(coalesce(d.data -> 'lista', '[]'::jsonb)) x(v)
      where d.col = 'config' and d.id like 'acao-' || (new.data ->> 'top') || '-%' and x.v ->> 'id' = new.data ->> 'acao' limit 1;
    v_tipo := 'direto';
    v_novo := jsonb_build_object('title', 'Inscrição nova da ' || (new.data ->> 'equipe'),
      'body', coalesce(new.data ->> 'nome', 'Alguém') || case when (new.data ->> 'servo')::boolean then ' vai servir' else ' confirmou presença' end
              || ' no ' || coalesce(v_ev ->> 'titulo', 'evento') || '.',
      'tag', 'adm3-insc-' || new.id);
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]') into v_subs
      from public.adm_push s join public.adm_membros m on m.user_id = s.user_id
      where m.ativo and m.perfil = 'coord' and m.equipe_lgnd = new.data ->> 'equipe';
  elsif new.col = 'config' and new.id like 'metatar-%-quadro' then
    -- a ADM mandou tarefa para um grupo: avisa os coordenadores das equipes daquele grupo
    if (new.data #>> '{avisar,em}') is null or (tg_op = 'UPDATE' and (new.data #>> '{avisar,em}') is not distinct from (old.data #>> '{avisar,em}')) then return null; end if;
    v_tipo := 'tarefa';
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]') into v_subs
      from public.adm_push s join public.adm_membros m on m.user_id = s.user_id
      where m.ativo and m.perfil = 'coord' and coalesce(new.data #> '{avisar,equipes}', '[]'::jsonb) ? m.equipe_lgnd;
  elsif new.col = 'config' and new.id in ('aviso', 'novidade') then
    -- planilha importada: todos os ADMs ativos, menos quem fez; novidade/mensagem: os escolhidos e também quem enviou
    v_tipo := new.id;
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]') into v_subs
      from public.adm_push s join public.adm_membros m on m.user_id = s.user_id
      where m.ativo and (new.id = 'novidade' or s.user_id is distinct from auth.uid())
        and (new.id <> 'novidade' or s.user_id = auth.uid() or coalesce(jsonb_array_length(new.data -> 'para'), 0) = 0 or (new.data -> 'para') ? m.id::text);
  else
    -- qualquer outra mudança: só o dono recebe, e só do que os outros fazem
    if v_ator.id is null or v_ator.dono then return null; end if;
    v_tipo := 'mudanca';
    select r.ultimo, r.extra into v_ult, v_extra from public.adm_push_ritmo r where r.ator = auth.uid() for update;
    if v_ult is not null and v_ult > now() - interval '20 seconds' then
      update public.adm_push_ritmo set extra = public.adm_push_ritmo.extra + 1 where public.adm_push_ritmo.ator = auth.uid();
      return null;
    end if;
    insert into public.adm_push_ritmo (ator, ultimo, extra) values (auth.uid(), now(), 0)
      on conflict (ator) do update set ultimo = now(), extra = 0;
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]') into v_subs
      from public.adm_push s join public.adm_membros m on m.user_id = s.user_id
      where m.ativo and m.dono;
  end if;

  if v_subs is null or jsonb_array_length(v_subs) = 0 then return null; end if;
  perform net.http_post(
    url := v_cfg.url,
    body := jsonb_build_object('tipo', v_tipo, 'col', new.col, 'id', new.id, 'novo', v_novo,
      'antes', case when tg_op = 'UPDATE' then old.data end, 'ator', v_ator.nome, 'extra', coalesce(v_extra, 0),
      'subs', v_subs, 'vapid', jsonb_build_object('pub', v_cfg.vapid_public, 'priv', v_cfg.vapid_private)),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000);
  return null;
exception when others then
  return null;   -- notificação nunca pode impedir de salvar
end $$;

-- ===== 3/3 historico-limpeza.sql =====
-- ADM 3COLINAS · Histórico guarda só os últimos 90 dias
-- Apaga agora o que tem mais de 90 dias e, daqui pra frente, limpa sozinho de vez em quando (ao registrar uma mudança).
-- Pode rodar de novo. Para mudar o prazo, troque '90 days' nos dois lugares.

delete from public.adm_historico where em < now() - interval '90 days';

create or replace function public.adm_historico_limpar()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if random() < 0.02 then   -- mais ou menos 1 a cada 50 mudanças, para não pesar
    delete from public.adm_historico where em < now() - interval '90 days';
  end if;
  return null;
end $$;

drop trigger if exists adm_historico_limpar on public.adm_historico;
create trigger adm_historico_limpar after insert on public.adm_historico
  for each statement execute function public.adm_historico_limpar();

select count(*) as registros_no_historico, pg_size_pretty(pg_total_relation_size('public.adm_historico')) as tamanho from public.adm_historico;
