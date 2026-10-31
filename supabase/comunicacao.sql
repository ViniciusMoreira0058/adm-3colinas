-- =====================================================================
-- ADM 3COLINAS · Comunicação: recado novo avisa TODOS os ADMs (sino e notificação com o app fechado)
-- Rode DEPOIS do push.sql, no SQL Editor do Supabase. Não tem chave nenhuma aqui: a chave VAPID continua só na tabela adm_push_cfg.
-- O que muda: config/mural-<top> com recado novo → todos os ADMs (menos quem mandou);
--             config/comvisto-* (o "Vi" de cada ADM) → não avisa ninguém.
-- =====================================================================
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

create or replace function public.adm_notif_registrar()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_ator public.adm_membros; v_dif jsonb := '{}'; k text;
  v_ignorar text[] := array['adm','admId','admEm','atualizado','importId','obsPor','obsEm'];
begin
  if tg_op = 'UPDATE' and old.data = new.data then return null; end if;
  select * into v_ator from public.adm_membros where user_id = auth.uid() limit 1;
  if random() < 0.02 then delete from public.adm_notif where em < now() - interval '10 days'; end if;

  if new.col = 'config' and new.id like 'comvisto-%' then return null; end if;
  if new.col = 'config' and new.id like 'mural-%' then
    if tg_op = 'UPDATE' and (new.data #>> '{msgs,0,id}') is not distinct from (old.data #>> '{msgs,0,id}') then return null; end if;
    insert into public.adm_notif (ator, ator_nome, publico, col, doc_id, acao, nome, dados)
    values (auth.uid(), v_ator.nome, 'todos', new.col, new.id, 'mural', left(new.data #>> '{msgs,0,txt}', 300), null);
    return null;
  end if;
  if new.col = 'config' and new.id in ('aviso', 'novidade') then
    insert into public.adm_notif (ator, ator_nome, publico, col, doc_id, acao, nome, dados)
    values (auth.uid(), v_ator.nome, 'todos', new.col, new.id, lower(tg_op), new.data ->> 'titulo', new.data);
    return null;
  end if;

  if v_ator.id is null or v_ator.dono then return null; end if;
  if new.col = 'pessoas' and tg_op = 'INSERT' and new.data ? 'importId' then return null; end if;   -- importação: o aviso da planilha já conta
  for k in select jsonb_object_keys(new.data) union select jsonb_object_keys(case when tg_op = 'UPDATE' then old.data else '{}'::jsonb end) loop
    if not (k = any(v_ignorar)) and left(k, 1) <> '_'
       and (case when tg_op = 'UPDATE' then old.data -> k end) is distinct from (new.data -> k) then
      v_dif := v_dif || jsonb_build_object(k, jsonb_build_array(case when tg_op = 'UPDATE' then old.data -> k end, new.data -> k));
    end if;
  end loop;
  if v_dif = '{}' then return null; end if;
  insert into public.adm_notif (ator, ator_nome, publico, col, doc_id, acao, nome, mudancas)
  values (auth.uid(), v_ator.nome, 'dono', new.col, new.id, case tg_op when 'INSERT' then 'criou' else 'alterou' end,
          coalesce(new.data ->> 'nome', new.data ->> 'titulo', new.data ->> 'item'), v_dif);
  return null;
exception when others then
  return null;   -- notificação nunca pode impedir de salvar
end $$;
