-- Testes da demonstração por visitante: dados de exemplo, gatilhos durante a
-- carga, limite por hora, permissões e limpeza. Roda com: make test-db
-- (transação desfeita no fim).

begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Um visitante novo, um visitante de ontem e uma conta de verdade antiga.
insert into auth.users (id, email, aud, role, created_at) values
  ('d0000000-0000-0000-0000-000000000001', 'visitante-novo@demo.zelo.test', 'authenticated', 'authenticated', now()),
  ('d0000000-0000-0000-0000-000000000002', 'visitante-ontem@demo.zelo.test', 'authenticated', 'authenticated', now() - interval '25 hours'),
  ('d0000000-0000-0000-0000-000000000003', 'dona.real@gmail.com', 'authenticated', 'authenticated', now() - interval '30 days');

-- ---------------------------------------------------------------------------
-- Quem é visitante
-- ---------------------------------------------------------------------------

select ok(public.eh_conta_de_visitante('visitante-3f2a9c@demo.zelo.test'), 'e-mail de visitante é reconhecido');
select ok(
  not public.eh_conta_de_visitante('visitante-x@demo.zelo.test.com.br')
  and not public.eh_conta_de_visitante('dona.real@gmail.com')
  and not public.eh_conta_de_visitante(null),
  'outros e-mails (e nenhum) não são de visitante'
);

-- ---------------------------------------------------------------------------
-- Preparar a conta do visitante
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.preparar_conta_demonstracao('d0000000-0000-0000-0000-000000000001') $$,
  'prepara a conta do visitante'
);

select is(
  (select count(*)::int from public.imoveis where dono_id = 'd0000000-0000-0000-0000-000000000001'),
  8, 'visitante recebe os 8 imóveis da Marta'
);
select is(
  (select count(*)::int from public.imoveis
   where dono_id = 'd0000000-0000-0000-0000-000000000001' and arquivado_em is not null),
  1, 'um deles arquivado (Casa Lapa)'
);
select is(
  (select count(*)::int from public.inquilinos q join public.imoveis i on i.id = q.imovel_id
   where i.dono_id = 'd0000000-0000-0000-0000-000000000001'),
  10, 'e os 10 inquilinos'
);
select is(
  (select count(*)::int from public.chamados c join public.imoveis i on i.id = c.imovel_id
   where i.dono_id = 'd0000000-0000-0000-0000-000000000001'),
  38, 'e os 38 chamados'
);
select is(
  (select count(*)::int from public.notificacoes n join public.chamados c on c.id = n.chamado_id
   join public.imoveis i on i.id = c.imovel_id
   where i.dono_id = 'd0000000-0000-0000-0000-000000000001'),
  0, 'a carga não avisa o dono nem manda e-mail aos inquilinos'
);
select is(
  (select count(*)::int from public.chamados c join public.imoveis i on i.id = c.imovel_id
   where i.dono_id = 'd0000000-0000-0000-0000-000000000001'
     and c.status = 'resolvido' and c.resolvido_em > now() - interval '1 day'),
  0, 'chamados resolvidos mantêm a data de resolução do exemplo (no passado)'
);

select lives_ok(
  $$ select public.preparar_conta_demonstracao('d0000000-0000-0000-0000-000000000001') $$,
  'preparar de novo a mesma conta não dá erro'
);
select is(
  (select count(*)::int from public.imoveis where dono_id = 'd0000000-0000-0000-0000-000000000001'),
  8, '...e não duplica os dados'
);

select throws_ok(
  $$ select public.preparar_conta_demonstracao('d0000000-0000-0000-0000-000000000003') $$,
  'P0001', 'Conta não é de visitante da demonstração.',
  'nunca coloca dados de exemplo numa conta de verdade'
);

-- ---------------------------------------------------------------------------
-- Depois da carga, os gatilhos voltam ao normal na mesma transação
-- ---------------------------------------------------------------------------

insert into public.chamados (id, imovel_id, categoria, descricao)
select 'd1000000-0000-0000-0000-000000000001', i.id, 'outros', 'Chamado de verdade'
from public.imoveis i
where i.dono_id = 'd0000000-0000-0000-0000-000000000001' and i.arquivado_em is null
limit 1;

select is(
  (select count(*)::int from public.notificacoes where chamado_id = 'd1000000-0000-0000-0000-000000000001'),
  1, 'chamado novo depois da carga avisa o dono normalmente'
);

update public.chamados set status = 'resolvido' where id = 'd1000000-0000-0000-0000-000000000001';
select ok(
  (select resolvido_em > now() - interval '1 minute' from public.chamados
   where id = 'd1000000-0000-0000-0000-000000000001'),
  'resolver depois da carga grava a hora de agora'
);

-- ---------------------------------------------------------------------------
-- Limpeza
-- ---------------------------------------------------------------------------

select results_eq(
  $$ select * from public.contas_demonstracao_vencidas() $$,
  $$ values ('d0000000-0000-0000-0000-000000000002'::uuid) $$,
  'vencidas: só o visitante de ontem (nem o novo, nem a conta de verdade antiga)'
);

insert into storage.objects (bucket_id, name)
select 'fotos-chamados', i.id || '/chamado/foto.jpg'
from public.imoveis i
where i.dono_id = 'd0000000-0000-0000-0000-000000000001'
limit 1;
insert into storage.objects (bucket_id, name)
values ('fotos-imoveis', 'aaaaaaaa-9999-0000-0000-000000000000/de-outra-pessoa.jpg');

select is(
  (select count(*)::int from public.arquivos_da_conta('d0000000-0000-0000-0000-000000000001')),
  1, 'arquivos da conta: só as fotos dos imóveis dela'
);

-- ---------------------------------------------------------------------------
-- Permissões: só o servidor (service_role)
-- ---------------------------------------------------------------------------

select ok(
  not has_function_privilege('authenticated', 'public.preparar_conta_demonstracao(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.preparar_conta_demonstracao(uuid)', 'execute'),
  'ninguém logado (nem anônimo) prepara conta'
);
select ok(
  not has_function_privilege('authenticated', 'public.criar_dados_demonstracao(uuid, text, boolean)', 'execute')
  and not has_function_privilege('service_role', 'public.criar_dados_demonstracao(uuid, text, boolean)', 'execute'),
  'criar_dados_demonstracao só é chamada por dentro (seed e preparar)'
);
select ok(
  not has_function_privilege('authenticated', 'public.contas_demonstracao_vencidas(interval)', 'execute')
  and not has_function_privilege('authenticated', 'public.arquivos_da_conta(uuid)', 'execute')
  and has_function_privilege('service_role', 'public.preparar_conta_demonstracao(uuid)', 'execute'),
  'limpeza só pelo servidor'
);

-- ---------------------------------------------------------------------------
-- Limite: no máximo 100 contas de visitante por hora
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role, created_at)
select gen_random_uuid(), format('visitante-lote%s@demo.zelo.test', n), 'authenticated', 'authenticated', now()
from generate_series(1, 100) n;

select throws_ok(
  $$ select public.preparar_conta_demonstracao('d0000000-0000-0000-0000-000000000001') $$,
  'P0001', 'A demonstração está cheia agora.',
  'passou de 100 contas na última hora: recusa'
);

select * from finish();
rollback;
