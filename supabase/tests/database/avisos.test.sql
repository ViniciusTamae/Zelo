-- Testes dos avisos: horário de silêncio, notificação do chamado novo e fila.
-- Roda com: make test-db (tudo dentro de uma transação desfeita no fim).
-- Horários em São Paulo (UTC-3): 23:00 local = 02:00 UTC do dia seguinte.

begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- ---------------------------------------------------------------------------
-- calcular_entrega: silêncio padrão das 21h às 8h (passa da meia-noite)
-- ---------------------------------------------------------------------------

select is(
  public.calcular_entrega('2026-10-28 15:00-03', '21:00', '08:00', false),
  '2026-10-28 15:00-03'::timestamptz,
  'fora do silêncio (15h): entrega na hora'
);
select is(
  public.calcular_entrega('2026-10-28 23:00-03', '21:00', '08:00', false),
  '2026-10-29 08:00-03'::timestamptz,
  '23h: espera até as 8h do dia seguinte'
);
select is(
  public.calcular_entrega('2026-10-29 02:30-03', '21:00', '08:00', false),
  '2026-10-29 08:00-03'::timestamptz,
  'madrugada (2h30): espera até as 8h do mesmo dia'
);
select is(
  public.calcular_entrega('2026-10-28 21:00-03', '21:00', '08:00', false),
  '2026-10-29 08:00-03'::timestamptz,
  '21h em ponto já é silêncio'
);
select is(
  public.calcular_entrega('2026-10-29 08:00-03', '21:00', '08:00', false),
  '2026-10-29 08:00-03'::timestamptz,
  '8h em ponto já acabou o silêncio'
);
select is(
  public.calcular_entrega('2026-10-28 23:00-03', '21:00', '08:00', true),
  '2026-10-28 23:00-03'::timestamptz,
  'urgente avisa na hora, mesmo no silêncio'
);

-- Silêncio dentro do mesmo dia (13h às 14h) e silêncio desligado
select is(
  public.calcular_entrega('2026-10-28 13:30-03', '13:00', '14:00', false),
  '2026-10-28 14:00-03'::timestamptz,
  'silêncio de almoço: espera até as 14h'
);
select is(
  public.calcular_entrega('2026-10-28 23:00-03', '13:00', '14:00', false),
  '2026-10-28 23:00-03'::timestamptz,
  'fora do silêncio de almoço: na hora'
);
select is(
  public.calcular_entrega('2026-10-28 23:00-03', '08:00', '08:00', false),
  '2026-10-28 23:00-03'::timestamptz,
  'início igual ao fim: sem silêncio'
);

-- O fuso é sempre o de São Paulo, mesmo com o banco em outro fuso
set local timezone = 'UTC';
select is(
  public.calcular_entrega('2026-10-29 02:00+00', '21:00', '08:00', false),
  '2026-10-29 11:00+00'::timestamptz,
  'com o banco em UTC: 23h de SP espera até 8h de SP (11h UTC)'
);
reset timezone;

-- ---------------------------------------------------------------------------
-- Chamado novo cria a notificação do dono
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.test', 'authenticated', 'authenticated');
-- Silêncio que cobre o dia todo, para o teste não depender da hora em que roda
update public.proprietarios set silencio_inicio = '00:00', silencio_fim = '23:59'
where id = '11111111-1111-1111-1111-111111111111';
insert into public.imoveis (id, dono_id, apelido, logradouro, numero, bairro) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Casa da Ana', 'Rua A', '1', 'Centro');

insert into public.chamados (id, imovel_id, categoria, descricao, urgente) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'hidraulica', 'Pinga', false),
  ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'eletrica', 'Curto', true);

select results_eq(
  $$select destino::text, proprietario_id, tipo from public.notificacoes
    where chamado_id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  $$values ('proprietario', '11111111-1111-1111-1111-111111111111'::uuid, 'chamado_novo')$$,
  'chamado novo gera uma notificação para o dono do imóvel'
);
select ok(
  (select entregar_em > now() from public.notificacoes where chamado_id = 'eeeeeeee-0000-0000-0000-000000000001'),
  'chamado comum no silêncio fica para depois'
);
select ok(
  (select entregar_em <= now() from public.notificacoes where chamado_id = 'eeeeeeee-0000-0000-0000-000000000002'),
  'chamado urgente no silêncio sai na hora'
);

-- ---------------------------------------------------------------------------
-- Fila: reserva só as vencidas e não entrega duas vezes
-- ---------------------------------------------------------------------------

-- Tira da frente avisos pendentes de quem usa o banco local (desfeito no fim).
update public.notificacoes set enviada = true
where chamado_id is distinct from 'eeeeeeee-0000-0000-0000-000000000001'
  and chamado_id is distinct from 'eeeeeeee-0000-0000-0000-000000000002';

set local role service_role;
select results_eq(
  $$select chamado_id from public.reservar_notificacoes('proprietario')$$,
  $$values ('eeeeeeee-0000-0000-0000-000000000002'::uuid)$$,
  'reserva só a notificação vencida (a urgente)'
);
select is_empty(
  $$select id from public.reservar_notificacoes('proprietario')$$,
  'uma segunda chamada logo depois não pega a mesma notificação'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok(
  $$select public.reservar_notificacoes('proprietario')$$,
  '42501',
  null,
  'proprietário logado não mexe na fila de avisos'
);

select * from finish();
rollback;
