-- Testes do banco ligados ao login: criação automática do proprietário
-- e isolamento entre proprietários pelo RLS.
-- Roda com: make test-db (tudo dentro de uma transação desfeita no fim).

begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- ---------------------------------------------------------------------------
-- Cadastro: o trigger cria o proprietário junto com o usuário do Auth
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.test', '{"nome": "Ana"}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'beto@teste.test', '{}', 'authenticated', 'authenticated');

select is(
  (select count(*)::int from public.proprietarios
   where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2,
  'cada usuário novo ganha um proprietário'
);

select is(
  (select nome from public.proprietarios where id = '11111111-1111-1111-1111-111111111111'),
  'Ana',
  'o nome vem dos metadados do cadastro'
);

select is(
  (select nome from public.proprietarios where id = '22222222-2222-2222-2222-222222222222'),
  null,
  'sem nome nos metadados, o nome fica vazio'
);

select is(
  (select (silencio_inicio, silencio_fim)::text from public.proprietarios
   where id = '22222222-2222-2222-2222-222222222222'),
  '(21:00:00,08:00:00)',
  'o horário de silêncio padrão é das 21h às 8h'
);

-- Dados de cada proprietário (inseridos como admin, antes de trocar de papel)
insert into public.imoveis (id, dono_id, apelido, logradouro, numero, bairro) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Casa da Ana', 'Rua A', '1', 'Centro'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Casa do Beto', 'Rua B', '2', 'Centro');

-- ---------------------------------------------------------------------------
-- Logado como Beto
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select results_eq(
  'select id from public.proprietarios',
  $$values ('22222222-2222-2222-2222-222222222222'::uuid)$$,
  'o proprietário só enxerga o próprio perfil'
);

select results_eq(
  'select apelido from public.imoveis',
  $$values ('Casa do Beto')$$,
  'o proprietário só enxerga os próprios imóveis'
);

select is_empty(
  $$update public.proprietarios set nome = 'invasor'
    where id = '11111111-1111-1111-1111-111111111111' returning id$$,
  'não consegue alterar o perfil de outro proprietário'
);

select is_empty(
  $$update public.imoveis set apelido = 'invasor'
    where id = 'aaaaaaaa-0000-0000-0000-000000000001' returning id$$,
  'não consegue alterar imóvel de outro proprietário'
);

select throws_ok(
  $$insert into public.imoveis (dono_id, apelido, logradouro, numero, bairro)
    values ('11111111-1111-1111-1111-111111111111', 'x', 'y', '1', 'z')$$,
  '42501',
  null,
  'não consegue criar imóvel em nome de outro proprietário'
);

select isnt_empty(
  $$update public.proprietarios set nome = 'Beto'
    where id = '22222222-2222-2222-2222-222222222222' returning id$$,
  'consegue alterar o próprio perfil'
);

-- ---------------------------------------------------------------------------
-- Sem login (anon): não enxerga nada
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is_empty(
  'select id from public.proprietarios',
  'visitante sem login não enxerga proprietários'
);

select is_empty(
  'select id from public.imoveis',
  'visitante sem login não enxerga imóveis'
);

select * from finish();
rollback;
