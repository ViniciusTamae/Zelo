-- Testes de excluir ou arquivar imóvel. Roda com: make test-db (transação
-- desfeita no fim).

begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.test', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'beto@teste.test', 'authenticated', 'authenticated');

-- Ana: um imóvel sem chamados, um só com chamado resolvido e um com chamado em aberto.
insert into public.imoveis (id, dono_id, apelido, logradouro, numero, bairro) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Sem chamados', 'Rua A', '1', 'Centro'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Com resolvido', 'Rua A', '2', 'Centro'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Com aberto', 'Rua A', '3', 'Centro'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Casa do Beto', 'Rua B', '1', 'Centro');

insert into public.inquilinos (id, imovel_id, nome, token_hash) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Inquilino 1',
   encode(extensions.digest('t-1', 'sha256'), 'hex')),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Inquilino 2',
   encode(extensions.digest('t-2', 'sha256'), 'hex'));

insert into public.chamados (id, imovel_id, categoria, descricao, status) values
  ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'outros', 'Já resolvido', 'aberto'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', 'outros', 'Ainda aberto', 'aberto');
update public.chamados set status = 'resolvido' where id = 'eeeeeeee-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------------
-- Logada como Ana
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  public.excluir_ou_arquivar_imovel('aaaaaaaa-0000-0000-0000-000000000001'),
  'excluido',
  'imóvel sem chamados é excluído'
);
select is_empty(
  $$select id from public.inquilinos where id = 'cccccccc-0000-0000-0000-000000000001'$$,
  'os inquilinos do imóvel excluído vão junto'
);

select throws_ok(
  $$select public.excluir_ou_arquivar_imovel('aaaaaaaa-0000-0000-0000-000000000003')$$,
  '22023',
  null,
  'imóvel com chamado em aberto não é excluído nem arquivado'
);

select is(
  public.excluir_ou_arquivar_imovel('aaaaaaaa-0000-0000-0000-000000000002'),
  'arquivado',
  'imóvel com chamados (todos resolvidos) é arquivado'
);
select results_eq(
  $$select count(*)::int from public.chamados where imovel_id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  $$values (1)$$,
  'o histórico do imóvel arquivado continua guardado'
);
select throws_ok(
  $$select public.excluir_ou_arquivar_imovel('aaaaaaaa-0000-0000-0000-000000000002')$$,
  'P0002',
  null,
  'imóvel já arquivado não é arquivado de novo'
);

select throws_ok(
  $$update public.chamados set status = 'em_andamento' where id = 'eeeeeeee-0000-0000-0000-000000000002'$$,
  '22023',
  null,
  'chamado de imóvel arquivado não é reaberto'
);

select throws_ok(
  $$select public.excluir_ou_arquivar_imovel('bbbbbbbb-0000-0000-0000-000000000001')$$,
  'P0002',
  null,
  'Ana não exclui o imóvel do Beto'
);

select lives_ok(
  $$update public.imoveis set arquivado_em = null where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  'Ana desarquiva o imóvel'
);

-- ---------------------------------------------------------------------------
-- Servidor (service role, como no link do inquilino)
-- ---------------------------------------------------------------------------

reset role;
update public.imoveis set arquivado_em = now() where id = 'aaaaaaaa-0000-0000-0000-000000000002';

select throws_ok(
  $$insert into public.chamados (imovel_id, inquilino_id, categoria, descricao)
    values ('aaaaaaaa-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002', 'outros', 'Novo')$$,
  '22023',
  null,
  'imóvel arquivado não recebe chamado novo'
);

select * from finish();
rollback;
