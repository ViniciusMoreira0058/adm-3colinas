-- =====================================================================
-- ADM 3COLINAS · Fotos (ex.: celulares guardados no check-in) no Supabase Storage
-- Rode uma vez no SQL Editor. Cria o "bucket" privado adm-fotos: só ADMs ativos veem; quem não é "só leitura" envia.
-- Sem ele o app continua funcionando e guarda a foto pequena junto do registro.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adm-fotos', 'adm-fotos', false, 3000000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists adm_fotos_ler on storage.objects;
create policy adm_fotos_ler on storage.objects for select to authenticated
  using (bucket_id = 'adm-fotos' and (public.adm_eu()).id is not null);

drop policy if exists adm_fotos_enviar on storage.objects;
create policy adm_fotos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'adm-fotos' and (public.adm_eu()).id is not null and (public.adm_eu()).nivel <> 'leitura');

drop policy if exists adm_fotos_trocar on storage.objects;
create policy adm_fotos_trocar on storage.objects for update to authenticated
  using (bucket_id = 'adm-fotos' and (public.adm_eu()).id is not null and (public.adm_eu()).nivel <> 'leitura');

drop policy if exists adm_fotos_apagar on storage.objects;
create policy adm_fotos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'adm-fotos' and (public.adm_eu()).id is not null and (public.adm_eu()).nivel <> 'leitura');
