-- Testes do endereço do imóvel: rua, número e bairro obrigatórios; complemento opcional.
-- Roda com: make test-db (tudo dentro de uma transação desfeita no fim).

begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.test', 'authenticated', 'authenticated');

select lives_ok(
  $$insert into public.imoveis (dono_id, apelido, logradouro, numero, bairro)
    values ('11111111-1111-1111-1111-111111111111', 'Casa', 'Rua A', 's/n', 'Centro')$$,
  'cadastra imóvel sem complemento'
);

select lives_ok(
  $$insert into public.imoveis (dono_id, apelido, logradouro, numero, complemento, bairro)
    values ('11111111-1111-1111-1111-111111111111', 'Apto', 'Rua A', '10', 'Apto 2', 'Centro')$$,
  'cadastra imóvel com complemento'
);

select throws_ok(
  $$insert into public.imoveis (dono_id, apelido, logradouro, numero, bairro)
    values ('11111111-1111-1111-1111-111111111111', 'Casa', '  ', '10', 'Centro')$$,
  '23514',
  null,
  'recusa rua em branco'
);

select throws_ok(
  $$insert into public.imoveis (dono_id, apelido, logradouro, numero, bairro)
    values ('11111111-1111-1111-1111-111111111111', 'Casa', 'Rua A', '', 'Centro')$$,
  '23514',
  null,
  'recusa número em branco'
);

select throws_ok(
  $$insert into public.imoveis (dono_id, apelido, logradouro, numero)
    values ('11111111-1111-1111-1111-111111111111', 'Casa', 'Rua A', '10')$$,
  '23502',
  null,
  'recusa imóvel sem bairro'
);

select * from finish();
rollback;
