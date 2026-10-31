-- =====================================================================
-- ADM 3COLINAS · Coordenadores de equipe (chefes e subchefes das equipes LGND)
-- Rodar só quando o acesso dos coordenadores for para o app real.
-- Supabase → SQL Editor → New query → cole tudo → Run. Pode rodar de novo.
--
-- O que muda:
--  * adm_membros ganha perfil ('adm' ou 'coord'), equipe_lgnd e cargo.
--  * Coordenador é sempre somente leitura e vê só:
--      - os legendários da equipe dele (nenhum outro legendário);
--      - os senderistas (para a página Famílias);
--      - pista e tops;
--      - em config, só cronograma, ao vivo, consagração, emergência,
--        mapa da pista e avisos gerais.
--    Financeiro, celulares, saúde (saude-*), check-in, remédios,
--    transporte, comunicação e o resto da config ficam bloqueados.
--  * Coordenador não recebe as notificações da ADM (sininho e push).
-- Obs.: o documento do senderista vai inteiro (o banco libera por linha);
-- o app esconde as pendências e dados de saúde na tela do coordenador.
-- =====================================================================

alter table public.adm_membros add column if not exists perfil text not null default 'adm';
alter table public.adm_membros add column if not exists equipe_lgnd text;
alter table public.adm_membros add column if not exists cargo text;
alter table public.adm_membros drop constraint if exists adm_membros_perfil_chk;
alter table public.adm_membros add constraint adm_membros_perfil_chk check (perfil in ('adm', 'coord'));

-- coordenador: sempre só leitura
create or replace function public.adm_coord_leitura()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.perfil = 'coord' then new.nivel := 'leitura'; new.dono := false; end if;
  return new;
end $$;
drop trigger if exists adm_coord_leitura on public.adm_membros;
create trigger adm_coord_leitura before insert or update on public.adm_membros
  for each row execute function public.adm_coord_leitura();

-- quais documentos de config o coordenador pode ler
create or replace function public.adm_coord_config(p_id text)
returns boolean language sql immutable set search_path = ''
as $$
  select p_id in ('emerg', 'pista-mapa', 'novidade', 'aviso')
      or p_id like 'cronoplano-%' or p_id like 'pista-vivo-%' or p_id like 'consag-%'
$$;

-- pode ver este registro? (mesma regra de antes + regra do coordenador)
create or replace function public.adm_pode_ler(p_col text, p_data jsonb)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare m public.adm_membros := public.adm_eu(); a text := public.adm_aba(p_col, p_data);
begin
  if m.id is null then return false; end if;
  if m.dono or m.nivel = 'total' then return true; end if;
  if m.perfil = 'coord' then
    if p_col = 'tops' or p_col = 'pista' then return true; end if;
    if p_col = 'config' then return false; end if;              -- config é conferida pelo id na política abaixo
    if a = 'legendarios' then return coalesce(m.equipe_lgnd, '') <> '' and p_data->>'equipe' = m.equipe_lgnd; end if;
    return a = 'participantes';                                  -- Famílias
  end if;
  if p_col in ('tops', 'config') then return true; end if;   -- nome do TOP e metas aparecem para todos
  return a = any(m.abas) or (a = 'participantes' and 'familias' = any(m.abas));
end $$;

-- pode alterar este registro? coordenador nunca altera
create or replace function public.adm_pode_gravar(p_col text, p_data jsonb)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare m public.adm_membros := public.adm_eu(); a text := public.adm_aba(p_col, p_data);
begin
  if m.id is null then return false; end if;
  if m.perfil = 'coord' then return false; end if;
  if m.dono or m.nivel = 'total' then return true; end if;
  if m.nivel = 'leitura' then return false; end if;
  if p_col = 'tops' then return false; end if;               -- iniciar/finalizar TOP: só acesso total
  if p_col = 'config' then return true; end if;
  return a = any(m.abas) or (a = 'participantes' and 'familias' = any(m.abas));
end $$;

-- leitura de adm_docs: config do coordenador conferida pelo id do documento
drop policy if exists adm_docs_ler on public.adm_docs;
create policy adm_docs_ler on public.adm_docs for select to authenticated
  using (public.adm_pode_ler(col, data)
         or (col = 'config' and coalesce((public.adm_eu()).perfil, '') = 'coord' and public.adm_coord_config(id)));

-- notificações: coordenador fora do sininho da ADM
drop policy if exists adm_notif_ler on public.adm_notif;
create policy adm_notif_ler on public.adm_notif for select to authenticated
  using (em > now() - interval '10 days' and (public.adm_eu()).id is not null
         and coalesce((public.adm_eu()).perfil, 'adm') <> 'coord'
         and (ator is distinct from auth.uid() or publico = 'todos')
         and ((publico = 'todos' and (ator = auth.uid() or coalesce(jsonb_array_length(dados -> 'para'), 0) = 0 or (dados -> 'para') ? (public.adm_eu()).id::text))
              or (publico = 'dono' and public.adm_eh_dono())));

-- push: coordenador não cadastra aparelho para receber as notificações da ADM
create or replace function public.adm_push_salvar(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if (public.adm_eu()).id is null then raise exception 'sem acesso'; end if;
  if (public.adm_eu()).perfil = 'coord' then return; end if;
  insert into public.adm_push (endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, criado_em = now();
end $$;
delete from public.adm_push s using public.adm_membros m where m.user_id = s.user_id and m.perfil = 'coord';

revoke all on function public.adm_coord_config(text) from public, anon;
grant execute on function public.adm_coord_config(text) to authenticated;
