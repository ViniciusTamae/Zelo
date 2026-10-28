-- Testes do cadastro de inquilinos: token do link e função de gerar novo link.
-- Roda com: make test-db (tudo dentro de uma transação desfeita no fim).

begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.test', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'beto@teste.test', 'authenticated', 'authenticated');

insert into public.imoveis (id, dono_id, apelido, logradouro, numero, bairro) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Casa da Ana', 'Rua A', '1', 'Centro'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Casa do Beto', 'Rua B', '2', 'Centro');

insert into public.inquilinos (id, imovel_id, nome) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Inquilino da Ana'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Inquilino do Beto');

-- ---------------------------------------------------------------------------
-- Token gerado pelo banco
-- ---------------------------------------------------------------------------

select matches(
  (select token from public.inquilinos where id = 'cccccccc-0000-0000-0000-000000000001'),
  '^[0-9a-f]{64}$',
  'o token do link tem 64 caracteres hexadecimais'
);

select isnt(
  (select token from public.inquilinos where id = 'cccccccc-0000-0000-0000-000000000001'),
  (select token from public.inquilinos where id = 'dddddddd-0000-0000-0000-000000000001'),
  'cada inquilino tem um token diferente'
);

select is(
  (select ativo from public.inquilinos where id = 'cccccccc-0000-0000-0000-000000000001'),
  true,
  'inquilino novo começa ativo'
);

-- Guarda os tokens atuais para comparar depois
create temporary table tokens_antes on commit drop as
  select id, token from public.inquilinos;
grant select on tokens_antes to authenticated;

-- ---------------------------------------------------------------------------
-- Logada como Ana
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select matches(
  public.gerar_novo_token_inquilino('cccccccc-0000-0000-0000-000000000001'),
  '^[0-9a-f]{64}$',
  'gerar novo link devolve um token novo'
);

select isnt(
  (select token from public.inquilinos where id = 'cccccccc-0000-0000-0000-000000000001'),
  (select token from tokens_antes where id = 'cccccccc-0000-0000-0000-000000000001'),
  'o token antigo foi substituído'
);

select is(
  public.gerar_novo_token_inquilino('dddddddd-0000-0000-0000-000000000001'),
  null,
  'não gera novo link para inquilino de outro proprietário'
);

select throws_ok(
  $$insert into public.inquilinos (imovel_id, nome)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'Intruso')$$,
  '42501',
  null,
  'não cadastra inquilino em imóvel de outro proprietário'
);

-- ---------------------------------------------------------------------------
-- Conferência como admin e acesso anônimo
-- ---------------------------------------------------------------------------

reset role;

select is(
  (select token from public.inquilinos where id = 'dddddddd-0000-0000-0000-000000000001'),
  (select token from tokens_antes where id = 'dddddddd-0000-0000-0000-000000000001'),
  'o token do inquilino do outro proprietário continua igual'
);

set local role anon;
select throws_ok(
  $$select public.gerar_novo_token_inquilino('cccccccc-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'visitante sem login não pode gerar novo link'
);

select * from finish();
rollback;
