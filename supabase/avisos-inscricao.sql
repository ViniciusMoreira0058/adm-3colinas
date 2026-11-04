-- ADM 3COLINAS · aviso no celular do coordenador quando alguém da equipe dele se inscreve num evento
-- Rode depois do avisos-coord.sql (substitui só a função adm_push_disparar, com tudo o que ela já fazia).
-- Pode rodar de novo.

create or replace function public.adm_push_disparar()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_cfg public.adm_push_cfg; v_ator public.adm_membros; v_tipo text; v_subs jsonb; v_extra int := 0; v_ult timestamptz; v_novo jsonb := new.data; v_ev jsonb;
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
