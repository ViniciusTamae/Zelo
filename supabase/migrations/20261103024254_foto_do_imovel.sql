-- Foto do imóvel: opcional, num bucket privado próprio (acesso por URL assinada).
-- Diferente das fotos dos chamados (enviadas pelo servidor em nome do
-- inquilino), aqui quem envia é o próprio proprietário logado, então as
-- políticas liberam ler, enviar e apagar só nas pastas dos imóveis dele.

-- Caminho no bucket fotos-imoveis: <imovel_id>/<arquivo>. Cada troca gera um
-- arquivo com nome novo (o navegador não mostra a foto antiga do cache).
alter table public.imoveis add column foto_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-imoveis',
  'fotos-imoveis',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "proprietario le fotos dos seus imoveis (imovel)"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos-imoveis'
    and (storage.foldername(name))[1] in (
      select id::text from public.imoveis where dono_id = (select auth.uid())
    )
  );

create policy "proprietario envia fotos dos seus imoveis (imovel)"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos-imoveis'
    and (storage.foldername(name))[1] in (
      select id::text from public.imoveis where dono_id = (select auth.uid())
    )
  );

create policy "proprietario apaga fotos dos seus imoveis (imovel)"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos-imoveis'
    and (storage.foldername(name))[1] in (
      select id::text from public.imoveis where dono_id = (select auth.uid())
    )
  );
