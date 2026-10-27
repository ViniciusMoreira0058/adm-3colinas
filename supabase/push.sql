-- =====================================================================
-- ADM 3COLINAS · notificações com o app fechado (Web Push)
-- Como usar: Supabase → SQL Editor → New query → cole tudo → Run.
-- Pode rodar mais de uma vez sem quebrar.
--
-- Quem recebe:
--   · o dono: tudo que os outros ADMs mudam no app
--   · todos os ADMs: planilha importada (config/aviso) e novidade do app (config/novidade)
-- O banco chama https://<site>/api/push, que entrega as notificações.
--
-- ANTES DE RODAR: troque COLE_A_CHAVE_PRIVADA_AQUI pela chave privada VAPID
-- (a cópia pronta fica fora do GitHub). Nunca publique a chave privada.
-- =====================================================================
create extension if not exists pg_net;

-- celulares/computadores que ativaram as notificações (um por navegador)
create table if not exists public.adm_push (
  endpoint  text primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  p256dh    text not null,
  auth      text not null,
  criado_em timestamptz not null default now()
);
alter table public.adm_push enable row level security;
revoke all on public.adm_push from anon, authenticated;

-- configuração do envio (só o banco lê; ninguém pelo app)
create table if not exists public.adm_push_cfg (
  id            int primary key default 1 check (id = 1),
  vapid_public  text not null,
  vapid_private text not null,
  url           text not null
);
alter table public.adm_push_cfg enable row level security;
revoke all on public.adm_push_cfg from anon, authenticated;
insert into public.adm_push_cfg (id, vapid_public, vapid_private, url)
values (1, 'BDxZeBfN6aI5VHiCjJAKEkj7S9GSXC0VSEYKZN4kiSA5x2PmmgACCDqd3n6wubEYsd1ed9dfXEF5DkyMZMXePtA',
        'COLE_A_CHAVE_PRIVADA_AQUI', 'https://adm-3colinas.vercel.app/api/push')
on conflict (id) do update set vapid_public = excluded.vapid_public, vapid_private = excluded.vapid_private, url = excluded.url;

-- evita uma enxurrada de avisos quando um ADM muda muita coisa de uma vez
create table if not exists public.adm_push_ritmo (
  ator   uuid primary key,
  ultimo timestamptz not null default now(),
  extra  int not null default 0
);
alter table public.adm_push_ritmo enable row level security;
revoke all on public.adm_push_ritmo from anon, authenticated;

-- o app guarda / apaga o aparelho de quem está logado
create or replace function public.adm_push_salvar(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if (public.adm_eu()).id is null then raise exception 'sem acesso'; end if;
  insert into public.adm_push (endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, criado_em = now();
end $$;
create or replace function public.adm_push_apagar(p_endpoint text)
returns void language sql security definer set search_path = ''
as $$ delete from public.adm_push where endpoint = p_endpoint and user_id = auth.uid() $$;
revoke all on function public.adm_push_salvar(text, text, text) from public, anon;
revoke all on function public.adm_push_apagar(text) from public, anon;
grant execute on function public.adm_push_salvar(text, text, text) to authenticated;
grant execute on function public.adm_push_apagar(text) to authenticated;

-- a cada mudança em adm_docs, decide quem recebe e chama o site
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

  if new.col = 'config' and new.id in ('aviso', 'novidade') then
    -- planilha importada ou novidade do app: todos os ADMs ativos, menos quem fez
    v_tipo := new.id;
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]') into v_subs
      from public.adm_push s join public.adm_membros m on m.user_id = s.user_id
      where m.ativo and s.user_id is distinct from auth.uid();
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
revoke all on function public.adm_push_disparar() from public, anon, authenticated;

drop trigger if exists adm_push on public.adm_docs;
create trigger adm_push after insert or update on public.adm_docs
  for each row execute function public.adm_push_disparar();
