-- Testes dos chamados: isolamento entre proprietários (tabela, eventos e fotos).
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

insert into public.inquilinos (id, imovel_id, nome, token_hash) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Inquilino da Ana',
   encode(extensions.digest('t-ana', 'sha256'), 'hex')),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Inquilino do Beto',
   encode(extensions.digest('t-beto', 'sha256'), 'hex'));

-- Chamados abertos pelos inquilinos (o app faz isso com a service role)
insert into public.chamados (id, imovel_id, inquilino_id, categoria, descricao, foto_path) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001', 'hidraulica', 'Vazamento na pia',
   'aaaaaaaa-0000-0000-0000-000000000001/eeeeeeee-0000-0000-0000-000000000001/foto.jpg'),
  ('ffffffff-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001', 'eletrica', 'Tomada sem energia',
   'bbbbbbbb-0000-0000-0000-000000000001/ffffffff-0000-0000-0000-000000000001/foto.jpg');

insert into public.eventos_chamado (chamado_id, autor, status_novo) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'inquilino', 'aberto'),
  ('ffffffff-0000-0000-0000-000000000001', 'inquilino', 'aberto');

insert into storage.objects (bucket_id, name) values
  ('fotos-chamados', 'aaaaaaaa-0000-0000-0000-000000000001/eeeeeeee-0000-0000-0000-000000000001/foto.jpg'),
  ('fotos-chamados', 'bbbbbbbb-0000-0000-0000-000000000001/ffffffff-0000-0000-0000-000000000001/foto.jpg');

select throws_ok(
  $$insert into public.chamados (imovel_id, inquilino_id, categoria, descricao)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'outros', 'Errado')$$,
  '23503',
  null,
  'inquilino só abre chamado no imóvel em que mora'
);

select throws_ok(
  $$insert into public.chamados (imovel_id, inquilino_id, categoria, descricao)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'outros', '   ')$$,
  '23514',
  null,
  'chamado sem descrição é recusado'
);

-- ---------------------------------------------------------------------------
-- Logada como Ana
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  'select descricao from public.chamados',
  $$values ('Vazamento na pia'::text)$$,
  'Ana vê só os chamados dos imóveis dela'
);

select is_empty(
  $$select id from public.eventos_chamado where chamado_id = 'ffffffff-0000-0000-0000-000000000001'$$,
  'Ana não vê o histórico de chamado do Beto'
);

select is_empty(
  $$update public.chamados set status = 'resolvido' where id = 'ffffffff-0000-0000-0000-000000000001' returning id$$,
  'Ana não muda o status de chamado do Beto'
);

select results_eq(
  $$select name from storage.objects where bucket_id = 'fotos-chamados'$$,
  $$values ('aaaaaaaa-0000-0000-0000-000000000001/eeeeeeee-0000-0000-0000-000000000001/foto.jpg'::text)$$,
  'Ana só enxerga as fotos dos imóveis dela'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('fotos-chamados', 'aaaaaaaa-0000-0000-0000-000000000001/x/foto.jpg')$$,
  '42501',
  null,
  'proprietário não envia foto direto ao bucket (só o servidor, pelo link do inquilino)'
);

-- ---------------------------------------------------------------------------
-- Visitante sem login
-- ---------------------------------------------------------------------------

reset role;
set local role anon;

select is_empty('select id from public.chamados', 'visitante sem login não lê chamados');
select is_empty(
  $$select name from storage.objects where bucket_id = 'fotos-chamados'$$,
  'visitante sem login não lê fotos'
);

select * from finish();
rollback;
