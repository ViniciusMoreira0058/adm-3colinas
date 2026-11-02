-- ADM 3COLINAS · avisos no celular para os coordenadores de equipe
-- Rode depois do push.sql, comunicacao.sql e coordenadores.sql.
-- 1) Quando a ADM manda uma tarefa para um grupo, os coordenadores das equipes do grupo recebem na hora.
-- 2) Todo dia às 9h, evento daqui a 2 dias com a equipe faltando homens avisa o coordenador daquela equipe.

create or replace function public.adm_push_disparar()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_cfg public.adm_push_cfg; v_ator public.adm_membros; v_tipo text; v_subs jsonb; v_extra int := 0; v_ult timestamptz;
begin
  select * into v_cfg from public.adm_push_cfg where id = 1;
  if v_cfg.url is null or v_cfg.vapid_private is null or v_cfg.vapid_private like 'COLE_%' then return null; end if;
  if tg_op = 'UPDATE' and old.data = new.data then return null; end if;
  select * into v_ator from public.adm_membros where user_id = auth.uid() limit 1;

  if new.col = 'config' and new.id like 'comvisto-%' then return null; end if;   -- "vi" no recado: não avisa ninguém
  if new.col = 'config' and new.id like 'mural-%' then
    -- recado novo na Comunicação: todos os ADMs ativos, menos quem mandou (fixar/desafixar não avisa)
    if tg_op = 'UPDATE' and (new.data #>> '{msgs,0,id}') is not distinct from (old.data #>> '{msgs,0,id}') then return null; end if;
    v_tipo := 'mural';
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]') into v_subs
      from public.adm_push s join public.adm_membros m on m.user_id = s.user_id
      where m.ativo and s.user_id is distinct from auth.uid();
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
    body := jsonb_build_object('tipo', v_tipo, 'col', new.col, 'id', new.id, 'novo', new.data,
      'antes', case when tg_op = 'UPDATE' then old.data end, 'ator', v_ator.nome, 'extra', coalesce(v_extra, 0),
      'subs', v_subs, 'vapid', jsonb_build_object('pub', v_cfg.vapid_public, 'priv', v_cfg.vapid_private)),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000);
  return null;
exception when others then
  return null;   -- notificação nunca pode impedir de salvar
end $$;

-- Todo dia às 9h: evento daqui a 2 dias em que alguma equipe ainda não tem os homens que precisa.
-- Avisa no celular os coordenadores daquela equipe.
create or replace function public.adm_push_eventos()
returns int language plpgsql security definer set search_path = ''
as $$
declare
  v_cfg public.adm_push_cfg; d record; ev jsonb; r jsonb; v_top text; n int; v_falta int; v_subs jsonb; v_env int := 0;
  v_alvo text := to_char((now() at time zone 'America/Sao_Paulo')::date + 2, 'YYYY-MM-DD');
begin
  select * into v_cfg from public.adm_push_cfg where id = 1;
  if v_cfg.url is null or v_cfg.vapid_private is null or v_cfg.vapid_private like 'COLE_%' then return 0; end if;
  for d in select id, data from public.adm_docs where col = 'config' and id like 'acao-%' loop
    v_top := regexp_replace(d.id, '^acao-(.+)-[0-9a-f-]{36}$', '\1');
    for ev in select x from jsonb_array_elements(coalesce(d.data -> 'lista', '[]'::jsonb)) x loop
      continue when coalesce(ev ->> 'data', '') <> v_alvo;
      for r in select y from jsonb_array_elements(coalesce(ev -> 'resp', '[]'::jsonb)) y loop
        continue when coalesce(nullif(r ->> 'homens', '')::numeric, 0) <= 0;
        select count(*) into n from public.adm_docs p
          where p.col = 'config' and p.id like 'acaopres-' || v_top || '-' || (ev ->> 'id') || '-%' and p.data ->> 'equipe' = r ->> 'eq';
        v_falta := (r ->> 'homens')::numeric - n;
        continue when v_falta <= 0;
        select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)) into v_subs
          from public.adm_push s join public.adm_membros m on m.user_id = s.user_id
          where m.ativo and m.perfil = 'coord' and m.equipe_lgnd = r ->> 'eq';
        continue when v_subs is null;
        perform net.http_post(
          url := v_cfg.url,
          body := jsonb_build_object('tipo', 'direto', 'col', 'config', 'id', d.id,
            'novo', jsonb_build_object('title', 'Faltam ' || v_falta || ' homens da ' || (r ->> 'eq'),
              'body', coalesce(ev ->> 'titulo', 'Evento') || ' é depois de amanhã. Mande o link da equipe para os servos.', 'tag', 'adm3-ev-' || (ev ->> 'id') || '-' || md5(r ->> 'eq')),
            'subs', v_subs, 'vapid', jsonb_build_object('pub', v_cfg.vapid_public, 'priv', v_cfg.vapid_private)),
          headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 10000);
        v_env := v_env + 1;
      end loop;
    end loop;
  end loop;
  return v_env;
end $$;
revoke all on function public.adm_push_eventos() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'adm-avisa-eventos';
select cron.schedule('adm-avisa-eventos', '0 12 * * *', 'select public.adm_push_eventos()');   -- 12h UTC = 9h em Franca
