-- Testes da foto do imóvel: cada proprietário só lê e envia fotos dos
-- próprios imóveis. Roda com: make test-db (transação desfeita no fim).

begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.test', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'beto@teste.test', 'authenticated', 'authenticated');

insert into public.imoveis (id, dono_id, apelido, logradouro, numero, bairro, foto_path) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Casa da Ana', 'Rua A', '1', 'Centro',
   'aaaaaaaa-0000-0000-0000-000000000001/foto-1.jpg'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Casa do Beto', 'Rua B', '2', 'Centro',
   'bbbbbbbb-0000-0000-0000-000000000001/foto-1.jpg');

insert into storage.objects (bucket_id, name) values
  ('fotos-imoveis', 'aaaaaaaa-0000-0000-0000-000000000001/foto-1.jpg'),
  ('fotos-imoveis', 'bbbbbbbb-0000-0000-0000-000000000001/foto-1.jpg');

-- ---------------------------------------------------------------------------
-- Logada como Ana
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  $$select name from storage.objects where bucket_id = 'fotos-imoveis'$$,
  $$values ('aaaaaaaa-0000-0000-0000-000000000001/foto-1.jpg'::text)$$,
  'Ana só enxerga as fotos dos imóveis dela'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('fotos-imoveis', 'aaaaaaaa-0000-0000-0000-000000000001/foto-2.jpg')$$,
  'Ana envia foto para o imóvel dela'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('fotos-imoveis', 'bbbbbbbb-0000-0000-0000-000000000001/foto-2.jpg')$$,
  '42501',
  null,
  'Ana não envia foto para o imóvel do Beto'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('fotos-imoveis', 'foto-solta.jpg')$$,
  '42501',
  null,
  'foto fora da pasta de um imóvel é recusada'
);

-- Apagar arquivo só pela API do Storage (o SQL direto é bloqueado por ele);
-- a política de apagar é exercitada no teste de ponta a ponta (trocar e remover foto).

select is_empty(
  $$update public.imoveis set foto_path = null
    where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning id$$,
  'Ana não mexe na foto do imóvel do Beto'
);

-- ---------------------------------------------------------------------------
-- Visitante sem login
-- ---------------------------------------------------------------------------

reset role;
set local role anon;

select is_empty(
  $$select name from storage.objects where bucket_id = 'fotos-imoveis'$$,
  'visitante sem login não lê fotos de imóveis'
);

select * from finish();
rollback;
