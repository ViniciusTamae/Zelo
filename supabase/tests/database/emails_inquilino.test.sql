-- Testes do e-mail ao inquilino na mudança de status e do link de avaliação.
-- Roda com: make test-db (tudo dentro de uma transação desfeita no fim).

begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.test', 'authenticated', 'authenticated');
insert into public.imoveis (id, dono_id, apelido, logradouro, numero, bairro) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Casa da Ana', 'Rua A', '1', 'Centro');
insert into public.inquilinos (id, imovel_id, nome, email, token_hash) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Maria', 'maria@teste.test',
   encode(extensions.digest('t-maria', 'sha256'), 'hex'));
insert into public.chamados (id, imovel_id, inquilino_id, categoria, descricao) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001', 'hidraulica', 'Vazamento'),
  -- Chamado sem inquilino (ex.: inquilino apagado)
  ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', null, 'outros', 'Porta');

select is(
  (select count(*)::int from public.notificacoes where destino = 'inquilino'),
  0,
  'abrir o chamado não manda e-mail ao próprio inquilino'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.mudar_status_chamado('eeeeeeee-0000-0000-0000-000000000001', 'em_andamento', 'Vou passar amanhã');
select public.mudar_status_chamado('eeeeeeee-0000-0000-0000-000000000002', 'em_andamento');
reset role;

select results_eq(
  $$select n.inquilino_id, n.tipo, e.status_novo::text, e.nota
    from public.notificacoes n join public.eventos_chamado e on e.id = n.evento_id
    where n.destino = 'inquilino'$$,
  $$values ('cccccccc-0000-0000-0000-000000000001'::uuid, 'status_chamado', 'em_andamento', 'Vou passar amanhã')$$,
  'mudança de status gera um e-mail para o inquilino, ligado ao evento com o recado'
);
select ok(
  (select entregar_em <= now() from public.notificacoes where destino = 'inquilino'),
  'o e-mail ao inquilino sai na hora (o silêncio é só do proprietário)'
);
select is(
  (select count(*)::int from public.notificacoes where destino = 'inquilino' and chamado_id = 'eeeeeeee-0000-0000-0000-000000000002'),
  0,
  'chamado sem inquilino não gera e-mail'
);

-- A avaliação do inquilino (evento sem status) não gera e-mail para ele mesmo
insert into public.eventos_chamado (chamado_id, autor, nota)
values ('eeeeeeee-0000-0000-0000-000000000001', 'inquilino', 'Nota 5 de 5.');
select is(
  (select count(*)::int from public.notificacoes where destino = 'inquilino'),
  1,
  'evento do próprio inquilino não vira e-mail'
);

-- Link de avaliação: só hash SHA-256; reabrir o chamado apaga o link
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.mudar_status_chamado('eeeeeeee-0000-0000-0000-000000000001', 'resolvido');
reset role;

select throws_ok(
  $$update public.chamados set avaliacao_token_hash = 'token-puro' where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'o link de avaliação é guardado só como hash'
);

update public.chamados set avaliacao_token_hash = encode(extensions.digest('aval', 'sha256'), 'hex')
where id = 'eeeeeeee-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.mudar_status_chamado('eeeeeeee-0000-0000-0000-000000000001', 'em_andamento', 'Voltou a pingar');
reset role;

select is(
  (select avaliacao_token_hash from public.chamados where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  null,
  'reabrir invalida o link de avaliação ainda não usado'
);
select is(
  (select count(*)::int from public.notificacoes where destino = 'inquilino'),
  3,
  'cada mudança de status (em andamento, resolvido, reaberto) é um e-mail'
);

select * from finish();
rollback;
