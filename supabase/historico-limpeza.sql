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
