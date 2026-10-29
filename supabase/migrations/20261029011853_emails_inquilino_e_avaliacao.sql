-- E-mail ao inquilino a cada mudança de status e pesquisa de satisfação.
--
-- 1. O proprietário muda o status (mudar_status_chamado grava um evento).
-- 2. O trigger abaixo enfileira uma notificação para o inquilino, ligada ao
--    evento (é dele que saem o novo status e o recado do dono).
-- 3. A Edge Function entregar-notificacoes manda o e-mail (só para inquilino
--    ativo com e-mail). Ao resolver, gera o link de avaliação de uso único:
--    o banco guarda só o hash do token (avaliacao_token_hash).
-- O horário de silêncio vale só para o proprietário: o e-mail sai na hora.

alter table public.notificacoes
  add column evento_id uuid references public.eventos_chamado (id) on delete cascade;

create index notificacoes_evento_id_idx on public.notificacoes (evento_id);

alter table public.chamados
  add column avaliacao_token_hash text unique
    check (avaliacao_token_hash ~ '^[0-9a-f]{64}$');

-- ---------------------------------------------------------------------------
-- Mudança de status pelo dono -> e-mail para o inquilino
-- ---------------------------------------------------------------------------

create function public.avisar_inquilino_do_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.autor = 'proprietario' and new.status_novo is not null then
    insert into public.notificacoes (destino, inquilino_id, chamado_id, evento_id, tipo)
    select 'inquilino', c.inquilino_id, c.id, new.id, 'status_chamado'
    from public.chamados c
    where c.id = new.chamado_id and c.inquilino_id is not null;
  end if;
  return new;
end;
$$;

create trigger avisar_inquilino_do_status
  after insert on public.eventos_chamado
  for each row execute function public.avisar_inquilino_do_status();

-- ---------------------------------------------------------------------------
-- Reabrir invalida o link de avaliação antigo
-- ---------------------------------------------------------------------------

create or replace function public.mudar_status_chamado(
  chamado uuid,
  novo_status public.status_chamado,
  nota text default null,
  valor numeric default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  atual public.status_chamado;
begin
  select c.status into atual
  from public.chamados c
  where c.id = chamado
  for update;

  if not found then
    raise exception 'Chamado não encontrado.' using errcode = 'P0002';
  end if;

  if not (
    (atual = 'aberto' and novo_status in ('em_andamento', 'resolvido'))
    or (atual = 'em_andamento' and novo_status = 'resolvido')
    or (atual = 'resolvido' and novo_status = 'em_andamento')
  ) then
    raise exception 'Não é possível passar de % para %.', atual, novo_status
      using errcode = '22023';
  end if;

  update public.chamados c
  set
    status = novo_status,
    -- O custo é informado ao resolver; sem valor novo, mantém o que havia.
    valor = case when novo_status = 'resolvido' then coalesce(mudar_status_chamado.valor, c.valor) else c.valor end,
    -- A avaliação do inquilino vale para a solução; reabrir descarta a
    -- avaliação e o link de avaliação ainda não usado.
    avaliacao_nota = case when novo_status = 'resolvido' then c.avaliacao_nota end,
    avaliacao_comentario = case when novo_status = 'resolvido' then c.avaliacao_comentario end,
    avaliacao_token_hash = case when novo_status = 'resolvido' then c.avaliacao_token_hash end
  where c.id = chamado;

  insert into public.eventos_chamado (chamado_id, autor, status_anterior, status_novo, nota)
  values (chamado, 'proprietario', atual, novo_status, nullif(trim(nota), ''));
end;
$$;
