-- Avisos ao proprietário (Web Push) com horário de silêncio.
--
-- Fluxo:
--   1. Chamado novo -> trigger cria a notificação com entregar_em calculado:
--      urgente ou fora do silêncio = agora; dentro do silêncio = fim do silêncio.
--   2. Notificação com entregar_em já vencido -> o banco chama na hora a Edge
--      Function entregar-notificacoes (pg_net, assíncrono, após o commit).
--   3. pg_cron chama a mesma função a cada 5 minutos: entrega as que estavam
--      esperando o silêncio acabar e tenta de novo as que falharam.
-- Fuso: America/Sao_Paulo. A URL das funções e o segredo ficam no Vault
-- (nomes: funcoes_url e notificacoes_segredo), configurados por ambiente.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

alter table public.notificacoes
  add column tentativas smallint not null default 0,
  add column reservada_ate timestamptz,
  add column ultimo_erro text;

-- ---------------------------------------------------------------------------
-- Quando entregar
-- ---------------------------------------------------------------------------

create function public.calcular_entrega(
  momento timestamptz,
  silencio_inicio time,
  silencio_fim time,
  urgente boolean
)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  agora_local timestamp := momento at time zone 'America/Sao_Paulo';
  hora time := agora_local::time;
  em_silencio boolean;
  fim_local timestamp;
begin
  if urgente or silencio_inicio = silencio_fim then
    return momento;
  end if;

  -- Janela que passa da meia-noite (21h às 8h) ou dentro do mesmo dia (13h às 14h).
  em_silencio := case
    when silencio_inicio < silencio_fim then hora >= silencio_inicio and hora < silencio_fim
    else hora >= silencio_inicio or hora < silencio_fim
  end;
  if not em_silencio then
    return momento;
  end if;

  fim_local := agora_local::date + silencio_fim;
  if fim_local <= agora_local then
    fim_local := fim_local + interval '1 day';
  end if;
  return fim_local at time zone 'America/Sao_Paulo';
end;
$$;

-- ---------------------------------------------------------------------------
-- Chamado novo -> notificação para o dono do imóvel
-- ---------------------------------------------------------------------------

create function public.notificar_chamado_novo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notificacoes (destino, proprietario_id, chamado_id, tipo, entregar_em)
  select 'proprietario', p.id, new.id, 'chamado_novo',
         public.calcular_entrega(now(), p.silencio_inicio, p.silencio_fim, new.urgente)
  from public.imoveis i
  join public.proprietarios p on p.id = i.dono_id
  where i.id = new.imovel_id;
  return new;
end;
$$;

create trigger notificar_chamado_novo
  after insert on public.chamados
  for each row execute function public.notificar_chamado_novo();

-- ---------------------------------------------------------------------------
-- Chamar a Edge Function de entrega
-- ---------------------------------------------------------------------------

create function public.chamar_entrega()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text;
  segredo text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'funcoes_url';
  select decrypted_secret into segredo from vault.decrypted_secrets where name = 'notificacoes_segredo';
  if url is null or segredo is null then
    raise warning 'Avisos desligados: configure funcoes_url e notificacoes_segredo no Vault.';
    return;
  end if;

  perform net.http_post(
    url := url || '/entregar-notificacoes',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-zelo-segredo', segredo),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.chamar_entrega() from public, anon, authenticated;

create function public.disparar_entrega()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.entregar_em <= now() then
    perform public.chamar_entrega();
  end if;
  return new;
end;
$$;

create trigger disparar_entrega
  after insert on public.notificacoes
  for each row execute function public.disparar_entrega();

select cron.schedule('entregar-notificacoes', '*/5 * * * *', 'select public.chamar_entrega()');

-- ---------------------------------------------------------------------------
-- Reserva de um lote para entregar (usada pela Edge Function)
-- ---------------------------------------------------------------------------

-- Marca as notificações vencidas como "em entrega" por 2 minutos, para duas
-- chamadas ao mesmo tempo (trigger + cron) não mandarem o mesmo aviso duas vezes.
-- Depois de 5 tentativas, a notificação é deixada de lado (fica o último erro).
create function public.reservar_notificacoes(para public.destino_notificacao, limite integer default 50)
returns setof public.notificacoes
language sql
security definer
set search_path = ''
as $$
  update public.notificacoes n
  set reservada_ate = now() + interval '2 minutes', tentativas = n.tentativas + 1
  where n.id in (
    select id from public.notificacoes
    where destino = para
      and not enviada
      and entregar_em <= now()
      and (reservada_ate is null or reservada_ate < now())
      and tentativas < 5
    order by entregar_em
    limit limite
    for update skip locked
  )
  returning n.*;
$$;

revoke execute on function public.reservar_notificacoes(public.destino_notificacao, integer) from public, anon, authenticated;
grant execute on function public.reservar_notificacoes(public.destino_notificacao, integer) to service_role;
