-- =====================================================================
-- ADM 3COLINAS · esquema do banco (Supabase / Postgres)
-- Como usar: Supabase → SQL Editor → New query → cole tudo → Run.
-- Pode rodar mais de uma vez sem quebrar.
-- Todas as tabelas e funções começam com adm_, então o app pode dividir
-- o projeto do Supabase com outro app (ex.: o do Bold) sem misturar nada.
--
-- ANTES DE RODAR: confira o e-mail do dono na seção 8 (fim do arquivo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EQUIPE (quem pode entrar no app)
--    O dono cadastra a pessoa com o e-mail e escolhe o que ela acessa.
--    Quando ela cria a senha no app com o mesmo e-mail, o login é ligado
--    a este cadastro.
--    nivel: total (tudo, inclusive Tops) | edita (só as abas liberadas)
--           | leitura (vê as abas liberadas, não altera nada)
--    abas: participantes, legendarios, familias, checklist, estoque, pista, tops
-- ---------------------------------------------------------------------
create table if not exists public.adm_membros (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users(id) on delete set null,
  nome       text not null,
  email      text not null,
  telefone   text,
  funcao     text not null default 'ADM',
  nivel      text not null default 'edita' check (nivel in ('total','edita','leitura')),
  abas       text[] not null default '{}',
  obs        text,
  ativo      boolean not null default true,
  dono       boolean not null default false,
  criado_em  timestamptz not null default now(),
  visto_em   timestamptz
);
create unique index if not exists adm_membros_email_idx on public.adm_membros (lower(email));

-- ---------------------------------------------------------------------
-- 2. DADOS DO APP (um documento JSON por registro)
--    col: pessoas (participantes e legendários), tarefas (checklist),
--         estoque, pista, tops, config
-- ---------------------------------------------------------------------
create table if not exists public.adm_docs (
  col            text not null check (col in ('pessoas','tarefas','estoque','pista','tops','config')),
  id             text not null,
  data           jsonb not null default '{}',
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid,
  primary key (col, id)
);

-- ---------------------------------------------------------------------
-- 3. FUNÇÕES DE ACESSO
-- ---------------------------------------------------------------------
-- meu cadastro (só se estiver ativo)
create or replace function public.adm_eu()
returns public.adm_membros language sql stable security definer set search_path = ''
as $$ select * from public.adm_membros where user_id = auth.uid() and ativo limit 1 $$;

-- a que aba pertence um registro
create or replace function public.adm_aba(p_col text, p_data jsonb)
returns text language sql immutable set search_path = ''
as $$
  select case p_col
    when 'pessoas' then case when p_data->>'tipo' = 'legendario' then 'legendarios' else 'participantes' end
    when 'tarefas' then 'checklist'
    when 'estoque' then 'estoque'
    when 'pista'   then 'pista'
    when 'tops'    then 'tops'
    else null end
$$;

-- pode ver este registro?
create or replace function public.adm_pode_ler(p_col text, p_data jsonb)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare m public.adm_membros := public.adm_eu(); a text := public.adm_aba(p_col, p_data);
begin
  if m.id is null then return false; end if;
  if m.dono or m.nivel = 'total' then return true; end if;
  if p_col in ('tops', 'config') then return true; end if;   -- nome do TOP e metas aparecem para todos
  return a = any(m.abas) or (a = 'participantes' and 'familias' = any(m.abas));
end $$;

-- pode alterar este registro?
create or replace function public.adm_pode_gravar(p_col text, p_data jsonb)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare m public.adm_membros := public.adm_eu(); a text := public.adm_aba(p_col, p_data);
begin
  if m.id is null then return false; end if;
  if m.dono or m.nivel = 'total' then return true; end if;
  if m.nivel = 'leitura' then return false; end if;
  if p_col = 'tops' then return false; end if;               -- iniciar/finalizar TOP: só acesso total
  if p_col = 'config' then return true; end if;
  return a = any(m.abas) or (a = 'participantes' and 'familias' = any(m.abas));
end $$;

create or replace function public.adm_eh_dono()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce((select dono from public.adm_membros where user_id = auth.uid() and ativo limit 1), false) $$;

-- liga a conta de login ao cadastro feito pelo dono (mesmo e-mail) e devolve o perfil.
-- Nulo = e-mail não cadastrado.
create or replace function public.adm_vincular()
returns json language plpgsql security definer set search_path = ''
as $$
declare r public.adm_membros; em text; achou boolean;
begin
  if auth.uid() is null then return null; end if;
  select * into r from public.adm_membros where user_id = auth.uid();
  if not found then
    select email into em from auth.users where id = auth.uid();
    perform set_config('adm.vinculando', '1', true);
    update public.adm_membros set user_id = auth.uid()
     where id = (select id from public.adm_membros
                  where user_id is null and lower(email) = lower(em)
                  order by criado_em limit 1)
    returning * into r;
    achou := found;
    perform set_config('adm.vinculando', '', true);
    if not achou then return null; end if;
  end if;
  if not r.ativo then return json_build_object('inativo', true); end if;
  return json_build_object('id', r.id, 'nome', r.nome, 'funcao', r.funcao, 'nivel', r.nivel,
                           'abas', r.abas, 'dono', r.dono);
end $$;

-- usado na tela "Primeiro acesso" antes de criar a senha
create or replace function public.adm_email_cadastrado(p_email text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.adm_membros where ativo and lower(email) = lower(trim(p_email))) $$;

-- último acesso (o app chama ao abrir e a cada 5 minutos de uso)
create or replace function public.adm_marcar_presenca()
returns void language sql security definer set search_path = ''
as $$ update public.adm_membros set visto_em = now() where user_id = auth.uid() and ativo $$;

-- altera só os campos enviados (roda com as permissões de quem chamou)
create or replace function public.adm_patch(p_col text, p_id text, p_patch jsonb)
returns void language plpgsql set search_path = ''
as $$
begin
  update public.adm_docs set data = data || p_patch, atualizado_em = now(), atualizado_por = auth.uid()
   where col = p_col and id = p_id;
  if not found then raise exception 'Registro não encontrado ou sem permissão'; end if;
end $$;

-- carimbo de quem alterou
create or replace function public.adm_carimbo()
returns trigger language plpgsql set search_path = ''
as $$ begin new.atualizado_em := now(); new.atualizado_por := auth.uid(); return new; end $$;
drop trigger if exists adm_carimbo on public.adm_docs;
create trigger adm_carimbo before insert or update on public.adm_docs
  for each row execute function public.adm_carimbo();

-- protege a conta do dono e a ligação com o login
create or replace function public.adm_proteger_membros()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.dono then raise exception 'A conta do dono não pode ser excluída'; end if;
    return old;
  end if;
  new.email := lower(trim(new.email));
  if tg_op = 'INSERT' then
    if new.dono and exists (select 1 from public.adm_membros where dono) then
      raise exception 'Já existe um dono cadastrado';
    end if;
    if coalesce(current_setting('adm.vinculando', true), '') <> '1' then new.user_id := null; end if;
    return new;
  end if;
  if old.dono and (not new.ativo or not new.dono) then
    raise exception 'A conta do dono fica sempre ativa';
  end if;
  if new.dono and not old.dono then raise exception 'Só existe um dono'; end if;
  -- trocou o e-mail: a pessoa cria a senha de novo com o e-mail novo
  if new.email is distinct from old.email then new.user_id := null;
  elsif new.user_id is distinct from old.user_id
        and new.user_id is not null
        and coalesce(current_setting('adm.vinculando', true), '') <> '1' then
    raise exception 'O login só é ligado pela própria pessoa';
  end if;
  return new;
end $$;
drop trigger if exists adm_proteger_membros on public.adm_membros;
create trigger adm_proteger_membros before insert or update or delete on public.adm_membros
  for each row execute function public.adm_proteger_membros();

-- permissões das funções
revoke all on function public.adm_eu(), public.adm_pode_ler(text, jsonb), public.adm_pode_gravar(text, jsonb),
  public.adm_eh_dono(), public.adm_vincular(), public.adm_email_cadastrado(text),
  public.adm_marcar_presenca(), public.adm_patch(text, text, jsonb) from public, anon;
grant execute on function public.adm_eu(), public.adm_pode_ler(text, jsonb), public.adm_pode_gravar(text, jsonb),
  public.adm_eh_dono(), public.adm_vincular(), public.adm_email_cadastrado(text),
  public.adm_marcar_presenca(), public.adm_patch(text, text, jsonb) to authenticated;
grant execute on function public.adm_email_cadastrado(text) to anon;

-- ---------------------------------------------------------------------
-- 4. RLS: cada pessoa só vê e altera o que o dono liberou (conferido no banco)
-- ---------------------------------------------------------------------
alter table public.adm_membros enable row level security;
alter table public.adm_docs    enable row level security;

drop policy if exists adm_membros_ler on public.adm_membros;
create policy adm_membros_ler on public.adm_membros for select to authenticated
  using (public.adm_eh_dono() or user_id = auth.uid());
drop policy if exists adm_membros_dono on public.adm_membros;
create policy adm_membros_dono on public.adm_membros for all to authenticated
  using (public.adm_eh_dono()) with check (public.adm_eh_dono());

drop policy if exists adm_docs_ler on public.adm_docs;
create policy adm_docs_ler on public.adm_docs for select to authenticated
  using (public.adm_pode_ler(col, data));
drop policy if exists adm_docs_criar on public.adm_docs;
create policy adm_docs_criar on public.adm_docs for insert to authenticated
  with check (public.adm_pode_gravar(col, data));
drop policy if exists adm_docs_alterar on public.adm_docs;
create policy adm_docs_alterar on public.adm_docs for update to authenticated
  using (public.adm_pode_gravar(col, data)) with check (public.adm_pode_gravar(col, data));
drop policy if exists adm_docs_apagar on public.adm_docs;
create policy adm_docs_apagar on public.adm_docs for delete to authenticated
  using (public.adm_pode_gravar(col, data));

-- ---------------------------------------------------------------------
-- 5. TEMPO REAL (o que um ADM muda aparece na hora para os outros)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'adm_docs') then
    alter publication supabase_realtime add table public.adm_docs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'adm_membros') then
    alter publication supabase_realtime add table public.adm_membros;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. DADOS INICIAIS (da planilha ADM TOP 1922: checklist, estoque, pista,
--    o TOP 1922 e as metas). Não apaga nem sobrescreve nada que já exista.
-- ---------------------------------------------------------------------
insert into public.adm_docs (col, id, data) values
  ('tarefas', 't01', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 1, "responsavel": "", "status": "afazer", "titulo": "Comprar Hidramax", "top": "top1922"}'::jsonb),
  ('tarefas', 't02', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 2, "responsavel": "", "status": "afazer", "titulo": "Comprar itens MRE", "top": "top1922"}'::jsonb),
  ('tarefas', 't03', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 3, "responsavel": "", "status": "afazer", "titulo": "Banana, maçã e Powerade dos senderistas no ônibus", "top": "top1922"}'::jsonb),
  ('tarefas', 't04', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 4, "responsavel": "", "status": "afazer", "titulo": "Montar MRE", "top": "top1922"}'::jsonb),
  ('tarefas', 't05', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 5, "responsavel": "", "status": "afazer", "titulo": "Pedir fardas, gorras e patchs", "top": "top1922"}'::jsonb),
  ('tarefas', 't06', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 6, "responsavel": "", "status": "afazer", "titulo": "Separar equipes", "top": "top1922"}'::jsonb),
  ('tarefas', 't07', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 7, "responsavel": "", "status": "afazer", "titulo": "Separar famílias", "top": "top1922"}'::jsonb),
  ('tarefas', 't08', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 8, "responsavel": "", "status": "afazer", "titulo": "Separar fardas e gorras por família", "top": "top1922"}'::jsonb),
  ('tarefas', 't09', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 9, "responsavel": "", "status": "afazer", "titulo": "Montar cronograma", "top": "top1922"}'::jsonb),
  ('tarefas', 't10', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 10, "responsavel": "", "status": "afazer", "titulo": "Montar mini guia ADM", "top": "top1922"}'::jsonb),
  ('tarefas', 't11', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 11, "responsavel": "", "status": "afazer", "titulo": "Comprar bombas", "top": "top1922"}'::jsonb),
  ('tarefas', 't12', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 12, "responsavel": "", "status": "afazer", "titulo": "Fazer tags das equipes", "top": "top1922"}'::jsonb),
  ('tarefas', 't13', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 13, "responsavel": "", "status": "afazer", "titulo": "Comprar sacos de 200 L", "top": "top1922"}'::jsonb),
  ('tarefas', 't14', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 14, "responsavel": "", "status": "afazer", "titulo": "Lacrar ônibus", "top": "top1922"}'::jsonb),
  ('tarefas', 't15', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 15, "responsavel": "", "status": "afazer", "titulo": "Pedir tags das famílias", "top": "top1922"}'::jsonb),
  ('tarefas', 't16', '{"fase": "pre", "fornecedor": "", "obs": "", "ordem": 16, "responsavel": "", "status": "afazer", "titulo": "Fazer cronogramas Coord, ADM e Base", "top": "top1922"}'::jsonb),
  ('tarefas', 't17', '{"fase": "checkin", "fornecedor": "", "obs": "", "ordem": 1, "responsavel": "", "status": "afazer", "titulo": "Levar extensão / energia", "top": "top1922"}'::jsonb),
  ('tarefas', 't18', '{"fase": "checkin", "fornecedor": "", "obs": "", "ordem": 2, "responsavel": "", "status": "afazer", "titulo": "Montar mesa para 5 ADMs", "top": "top1922"}'::jsonb),
  ('tarefas', 't19', '{"fase": "checkin", "fornecedor": "", "obs": "", "ordem": 3, "responsavel": "", "status": "afazer", "titulo": "Separar tags das famílias", "top": "top1922"}'::jsonb),
  ('tarefas', 't20', '{"fase": "pos", "fornecedor": "", "obs": "", "ordem": 1, "responsavel": "", "status": "afazer", "titulo": "Criar grupos das famílias", "top": "top1922"}'::jsonb),
  ('tarefas', 't21', '{"fase": "pos", "fornecedor": "", "obs": "", "ordem": 2, "responsavel": "", "status": "afazer", "titulo": "Adicionar todos no Manada", "top": "top1922"}'::jsonb),
  ('tarefas', 't22', '{"fase": "pos", "fornecedor": "", "obs": "", "ordem": 3, "responsavel": "", "status": "afazer", "titulo": "Ver se ficou algum documento", "top": "top1922"}'::jsonb),
  ('estoque', 'a01', '{"grupo": "armario", "item": "Gorras", "local": "Armário LGND", "ordem": 1, "qtd": 66}'::jsonb),
  ('estoque', 'a02', '{"grupo": "armario", "item": "Snickers", "local": "Armário LGND", "ordem": 2, "qtd": 13}'::jsonb),
  ('estoque', 'a03', '{"grupo": "armario", "item": "Hidramax 20 g", "local": "Armário LGND", "ordem": 3, "qtd": 1}'::jsonb),
  ('estoque', 'a04', '{"grupo": "armario", "item": "Hidramax 400 g", "local": "Armário LGND", "ordem": 4, "qtd": 0}'::jsonb),
  ('estoque', 'a05', '{"grupo": "armario", "item": "Gel carbo", "local": "Armário LGND", "ordem": 5, "qtd": 0}'::jsonb),
  ('estoque', 'a06', '{"grupo": "armario", "item": "Tag Família 01", "local": "Armário LGND", "ordem": 6, "qtd": 11}'::jsonb),
  ('estoque', 'a07', '{"grupo": "armario", "item": "Tag Família 02", "local": "Armário LGND", "ordem": 7, "qtd": 12}'::jsonb),
  ('estoque', 'a08', '{"grupo": "armario", "item": "Tag Família 03", "local": "Armário LGND", "ordem": 8, "qtd": 11}'::jsonb),
  ('estoque', 'a09', '{"grupo": "armario", "item": "Tag Família 04", "local": "Armário LGND", "ordem": 9, "qtd": 12}'::jsonb),
  ('estoque', 'a10', '{"grupo": "armario", "item": "Tag Família 05", "local": "Armário LGND", "ordem": 10, "qtd": 12}'::jsonb),
  ('estoque', 'a11', '{"grupo": "armario", "item": "Tag Família 06", "local": "Armário LGND", "ordem": 11, "qtd": 12}'::jsonb),
  ('estoque', 'a12', '{"grupo": "armario", "item": "Tag Família 07", "local": "Armário LGND", "ordem": 12, "qtd": 13}'::jsonb),
  ('estoque', 'a13', '{"grupo": "armario", "item": "Tag Família 08", "local": "Armário LGND", "ordem": 13, "qtd": 13}'::jsonb),
  ('estoque', 'a14', '{"grupo": "armario", "item": "Tag Família 09", "local": "Armário LGND", "ordem": 14, "qtd": 13}'::jsonb),
  ('estoque', 'a15', '{"grupo": "armario", "item": "Tag Família 10", "local": "Armário LGND", "ordem": 15, "qtd": 15}'::jsonb),
  ('estoque', 'a16', '{"grupo": "armario", "item": "Tag Família 11", "local": "Armário LGND", "ordem": 16, "qtd": 25}'::jsonb),
  ('estoque', 'a17', '{"grupo": "armario", "item": "Tag Família 12", "local": "Armário LGND", "ordem": 17, "qtd": 25}'::jsonb),
  ('estoque', 'a18', '{"grupo": "armario", "item": "Tag Família 01 OFC", "local": "Com Vinicius", "ordem": 18, "qtd": 21}'::jsonb),
  ('estoque', 'a19', '{"grupo": "armario", "item": "Tag Família 12 OFC", "local": "Com Vinicius", "ordem": 19, "qtd": 21}'::jsonb),
  ('estoque', 'a20', '{"grupo": "armario", "item": "Adesivos carro aut.", "local": "Armário LGND", "ordem": 20, "qtd": 17}'::jsonb),
  ('estoque', 'a21', '{"grupo": "armario", "item": "Tag Intercessão", "local": "Armário LGND", "ordem": 21, "qtd": 9}'::jsonb),
  ('estoque', 'a22', '{"grupo": "armario", "item": "Tag Eventos", "local": "Armário LGND", "ordem": 22, "qtd": 6}'::jsonb),
  ('estoque', 'a23', '{"grupo": "armario", "item": "Tag Segurança", "local": "Armário LGND", "ordem": 23, "qtd": 2}'::jsonb),
  ('estoque', 'a24', '{"grupo": "armario", "item": "Tag Voz", "local": "Armário LGND", "ordem": 24, "qtd": 18}'::jsonb),
  ('estoque', 'a25', '{"grupo": "armario", "item": "Tag ADM", "local": "Armário LGND", "ordem": 25, "qtd": 19}'::jsonb),
  ('estoque', 'a26', '{"grupo": "armario", "item": "Tag Hakunas", "local": "Armário LGND", "ordem": 26, "qtd": 15}'::jsonb),
  ('estoque', 'a27', '{"grupo": "armario", "item": "Tag Logística", "local": "Armário LGND", "ordem": 27, "qtd": 22}'::jsonb),
  ('estoque', 'a28', '{"grupo": "armario", "item": "Tag Mídia", "local": "Armário LGND", "ordem": 28, "qtd": 13}'::jsonb),
  ('estoque', 'm01', '{"grupo": "mre", "item": "Hidramax", "local": "Armário LGND", "ordem": 1, "qtd": 1, "resp": "Vinicius"}'::jsonb),
  ('estoque', 'm02', '{"grupo": "mre", "item": "Café solúvel", "local": "Armário LGND", "ordem": 2, "qtd": 83, "resp": "Gustavo Arantes"}'::jsonb),
  ('estoque', 'm03', '{"grupo": "mre", "item": "Atum", "local": "Armário LGND", "ordem": 3, "qtd": 11, "resp": "Henrique"}'::jsonb),
  ('estoque', 'm04', '{"grupo": "mre", "item": "Doce de leite", "local": "Armário LGND", "ordem": 4, "qtd": 70, "resp": "Henrique"}'::jsonb),
  ('estoque', 'm05', '{"grupo": "mre", "item": "Rapadura", "local": "Armário LGND", "ordem": 5, "qtd": 126, "resp": "Henrique"}'::jsonb),
  ('estoque', 'm06', '{"grupo": "mre", "item": "Barra de cereal", "local": "Armário LGND", "ordem": 6, "qtd": 26, "resp": "Gustavo Arantes", "obs": "Mercado Livre"}'::jsonb),
  ('estoque', 'm07', '{"grupo": "mre", "item": "Salsicha em lata", "local": "Armário LGND", "ordem": 7, "qtd": 20, "resp": "Henrique"}'::jsonb),
  ('estoque', 'm08', '{"grupo": "mre", "item": "Clube Social / Pit Stop", "local": "Armário LGND", "ordem": 8, "qtd": 0, "resp": "Henrique"}'::jsonb),
  ('estoque', 'm09', '{"grupo": "mre", "item": "Miojo", "local": "Armário LGND", "ordem": 9, "qtd": 51, "resp": "Henrique"}'::jsonb),
  ('estoque', 'm10', '{"grupo": "mre", "item": "Sacola plástica MRE vazia", "local": "Armário LGND", "ordem": 10, "qtd": 0}'::jsonb),
  ('estoque', 'e01', '{"conferir": true, "grupo": "equip", "item": "Fogareiro das famílias", "ordem": 1, "qtd": 6, "obs": "6 lacrados · abertos falta conferir"}'::jsonb),
  ('estoque', 'e02', '{"conferir": true, "grupo": "equip", "item": "Abridor de latas", "ordem": 2, "qtd": null}'::jsonb),
  ('estoque', 'e03', '{"conferir": true, "grupo": "equip", "item": "Fita de sinalização amarela/preta", "ordem": 3, "qtd": null}'::jsonb),
  ('estoque', 'e04', '{"conferir": true, "grupo": "equip", "item": "Bomba nº 10", "ordem": 4, "qtd": null}'::jsonb),
  ('estoque', 'e05', '{"conferir": true, "grupo": "equip", "item": "Gás para fogareiro", "ordem": 5, "qtd": null}'::jsonb),
  ('estoque', 'e06', '{"conferir": false, "grupo": "equip", "item": "Tábua de pinus para Ceia do Rei", "ordem": 6, "qtd": 3}'::jsonb),
  ('pista', 'd1', '{"dia": "D1", "ordem": 1, "trechos": [{"de": "Desembarque", "m": 1780, "para": "2º Revista", "tempo": "46 minutos"}, {"de": "2º Revista", "m": 3400, "para": "Cemitério", "tempo": "1 hora e 30 minutos"}, {"de": "Cemitério", "m": 1850, "para": "Cercados pelo mundo", "tempo": "44 minutos"}, {"de": "Cercados pelo mundo", "m": 1650, "para": "Camp D1", "tempo": "1 hora e 10 minutos"}]}'::jsonb),
  ('pista', 'd2', '{"dia": "D2", "ordem": 2, "trechos": [{"de": "Camp D1", "m": 550, "para": "Casa aband. / Poder da mesa", "tempo": "15 minutos"}, {"de": "Casa aband. / Poder da mesa", "m": 2900, "para": "Salto da fé", "tempo": "1 hora e 32 minutos"}, {"de": "Salto da fé", "m": 250, "para": "Pureza radical", "tempo": "10 minutos"}, {"de": "Pureza radical", "m": 370, "para": "Corredor / Milha extra", "tempo": "10 minutos"}, {"de": "Corredor / Milha extra", "m": 310, "para": "Camp D2", "tempo": "12 minutos"}, {"de": "Camp D2", "m": 250, "para": "Vigília", "tempo": "9 minutos"}, {"de": "Vigília", "m": 250, "para": "Camp D2", "tempo": "9 minutos"}]}'::jsonb),
  ('pista', 'd3', '{"dia": "D3", "ordem": 3, "trechos": [{"de": "Camp D2", "m": 250, "para": "Snickers", "tempo": "10 minutos"}, {"de": "Snickers", "m": 2300, "para": "Naamã", "tempo": "1 hora e 10 minutos"}, {"de": "Naamã", "m": 500, "para": "Bússola / Almoço", "tempo": "20 minutos"}, {"de": "Bússola / Almoço", "m": 250, "para": "Lázaro", "tempo": "12 minutos"}, {"de": "Lázaro", "m": 280, "para": "Peleja", "tempo": "15 minutos"}, {"de": "Peleja", "m": 620, "para": "Entregue seu sustento", "tempo": "30 minutos"}, {"de": "Entregue seu sustento", "m": 1830, "para": "Ceia do Rei", "tempo": "58 minutos"}]}'::jsonb),
  ('tops', 'top1922', '{"criadoEm": "2026-10-26T09:24:00Z", "fim": "", "inicio": "", "kitsMRE": 16, "local": "Franca - SP", "nome": "TOP 1922", "status": "ativo"}'::jsonb),
  ('config', 'geral', '{"alertaBaixo": 5, "kitsMRE": 16, "metaMRE": 110, "topAtual": "top1922"}'::jsonb)
on conflict (col, id) do nothing;

-- ---------------------------------------------------------------------
-- 7. (sem participantes aqui: eles entram pelo app, em Participantes →
--    Colar da planilha, para os dados pessoais não ficarem no GitHub)
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 8. DONO (conta principal; troque o e-mail se for outro)
--    Depois ele entra no app em "Primeiro acesso" com esse e-mail e cria a senha.
-- ---------------------------------------------------------------------
insert into public.adm_membros (nome, funcao, email, nivel, dono)
select 'Vinicius Moreira', 'Coordenador ADM', 'barbeariavm0058@gmail.com', 'total', true
where not exists (select 1 from public.adm_membros where dono);
