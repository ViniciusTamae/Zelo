-- Testes da mudança de status (public.mudar_status_chamado).
-- Roda com: make test-db (tudo dentro de uma transação desfeita no fim).

begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.test', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'beto@teste.test', 'authenticated', 'authenticated');

insert into public.imoveis (id, dono_id, apelido, logradouro, numero, bairro) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Casa da Ana', 'Rua A', '1', 'Centro'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Casa do Beto', 'Rua B', '2', 'Centro');

insert into public.chamados (id, imovel_id, categoria, descricao) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'hidraulica', 'Vazamento'),
  ('ffffffff-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'eletrica', 'Tomada');

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- aberto -> em_andamento, com recado
select lives_ok(
  $$select public.mudar_status_chamado('eeeeeeee-0000-0000-0000-000000000001', 'em_andamento', '  Encanador vai sexta  ')$$,
  'Ana começa o atendimento'
);
select is(
  (select status::text from public.chamados where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  'em_andamento',
  'o chamado fica em andamento'
);
select results_eq(
  $$select autor::text, status_anterior::text, status_novo::text, nota from public.eventos_chamado
    where chamado_id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  $$values ('proprietario', 'aberto', 'em_andamento', 'Encanador vai sexta')$$,
  'o histórico registra quem mudou, de qual para qual status e o recado (sem espaços nas pontas)'
);

-- em_andamento -> resolvido, com custo
select lives_ok(
  $$select public.mudar_status_chamado('eeeeeeee-0000-0000-0000-000000000001', 'resolvido', null, 150.50)$$,
  'Ana resolve informando o custo'
);
select results_eq(
  $$select status::text, valor, resolvido_em is not null from public.chamados where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  $$values ('resolvido', 150.50::numeric, true)$$,
  'resolvido guarda o custo e a data da solução'
);

-- Transição inválida
select throws_ok(
  $$select public.mudar_status_chamado('eeeeeeee-0000-0000-0000-000000000001', 'aberto')$$,
  '22023',
  null,
  'não volta para "aberto"'
);
select throws_ok(
  $$select public.mudar_status_chamado('eeeeeeee-0000-0000-0000-000000000001', 'resolvido')$$,
  '22023',
  null,
  'não "resolve" de novo o que já está resolvido'
);

-- Reabrir: limpa a data de solução, mantém o custo
select lives_ok(
  $$select public.mudar_status_chamado('eeeeeeee-0000-0000-0000-000000000001', 'em_andamento', 'Voltou a vazar')$$,
  'Ana reabre o chamado'
);
select results_eq(
  $$select status::text, resolvido_em is null, valor from public.chamados where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  $$values ('em_andamento', true, 150.50::numeric)$$,
  'reaberto: sem data de solução, custo anterior mantido'
);
select is(
  (select count(*)::int from public.eventos_chamado where chamado_id = 'eeeeeeee-0000-0000-0000-000000000001'),
  3,
  'cada mudança gera um evento'
);

-- Chamado de outro dono
select throws_ok(
  $$select public.mudar_status_chamado('ffffffff-0000-0000-0000-000000000001', 'em_andamento')$$,
  'P0002',
  null,
  'Ana não muda o status do chamado do Beto (para ela, ele não existe)'
);

reset role;
select is(
  (select status::text from public.chamados where id = 'ffffffff-0000-0000-0000-000000000001'),
  'aberto',
  'o chamado do Beto continua aberto'
);

set local role anon;
select throws_ok(
  $$select public.mudar_status_chamado('eeeeeeee-0000-0000-0000-000000000001', 'resolvido')$$,
  '42501',
  null,
  'visitante sem login não muda status'
);

select * from finish();
rollback;
