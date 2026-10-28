-- Testes dos inquilinos: hash do token do link e isolamento entre proprietários.
-- Roda com: make test-db (tudo dentro de uma transação desfeita no fim).

begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.test', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'beto@teste.test', 'authenticated', 'authenticated');

insert into public.imoveis (id, dono_id, apelido, logradouro, numero, bairro) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Casa da Ana', 'Rua A', '1', 'Centro'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Casa do Beto', 'Rua B', '2', 'Centro');

insert into public.inquilinos (id, imovel_id, nome, token_hash) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Inquilino da Ana',
   encode(extensions.digest('token-da-ana', 'sha256'), 'hex')),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Inquilino do Beto',
   encode(extensions.digest('token-do-beto', 'sha256'), 'hex'));

-- ---------------------------------------------------------------------------
-- Só o hash do token fica no banco
-- ---------------------------------------------------------------------------

select hasnt_column('public', 'inquilinos', 'token', 'a tabela não guarda o token puro');

select throws_ok(
  $$insert into public.inquilinos (imovel_id, nome)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'Sem token')$$,
  '23502',
  null,
  'inquilino sem token_hash é recusado (o hash vem do app)'
);

select throws_ok(
  $$insert into public.inquilinos (imovel_id, nome, token_hash)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'Token puro', 'token-em-texto')$$,
  '23514',
  null,
  'token_hash fora do formato SHA-256 hex é recusado'
);

select throws_ok(
  format(
    $$insert into public.inquilinos (imovel_id, nome, token_hash) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Repetido', %L)$$,
    encode(extensions.digest('token-da-ana', 'sha256'), 'hex')
  ),
  '23505',
  null,
  'dois inquilinos não podem ter o mesmo token'
);

select is(
  (select ultimo_acesso_em from public.inquilinos where id = 'cccccccc-0000-0000-0000-000000000001'),
  null,
  'inquilino novo ainda não abriu o link'
);

select hasnt_function('public', 'gerar_novo_token_inquilino', 'a função antiga de gerar token foi removida');

-- ---------------------------------------------------------------------------
-- Logada como Ana: só enxerga e altera os próprios inquilinos
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  'select nome from public.inquilinos',
  $$values ('Inquilino da Ana'::text)$$,
  'Ana lê só os próprios inquilinos'
);

select is_empty(
  $$select id from public.inquilinos where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  'Ana não lê o inquilino do Beto nem pelo id'
);

select is_empty(
  $$select id from public.imoveis where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'Ana não lê o imóvel do Beto nem pelo id'
);

select is_empty(
  format(
    $$update public.inquilinos set token_hash = %L where id = 'dddddddd-0000-0000-0000-000000000001' returning id$$,
    encode(extensions.digest('token-da-ana-roubado', 'sha256'), 'hex')
  ),
  'Ana não troca o link do inquilino do Beto'
);

select isnt_empty(
  format(
    $$update public.inquilinos set token_hash = %L where id = 'cccccccc-0000-0000-0000-000000000001' returning id$$,
    encode(extensions.digest('token-novo-da-ana', 'sha256'), 'hex')
  ),
  'Ana gera um novo link para o próprio inquilino'
);

select throws_ok(
  format(
    $$insert into public.inquilinos (imovel_id, nome, token_hash) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Intruso', %L)$$,
    encode(extensions.digest('token-intruso', 'sha256'), 'hex')
  ),
  '42501',
  null,
  'Ana não cadastra inquilino em imóvel do Beto'
);

-- ---------------------------------------------------------------------------
-- Conferência como admin e acesso anônimo
-- ---------------------------------------------------------------------------

reset role;

select is(
  (select token_hash from public.inquilinos where id = 'dddddddd-0000-0000-0000-000000000001'),
  encode(extensions.digest('token-do-beto', 'sha256'), 'hex'),
  'o link do inquilino do Beto continua o mesmo'
);

set local role anon;
select is_empty('select id from public.inquilinos', 'visitante sem login não lê inquilinos');

select * from finish();
rollback;
