-- Mudança de status de um chamado pelo proprietário, numa transação só:
-- confere a transição, atualiza o chamado e registra o evento no histórico.
-- security invoker: roda com o RLS de quem chama, então um dono não mexe no
-- chamado de outro (para ele, o chamado "não existe").
--
-- Transições aceitas (as mesmas de src/lib/chamados/transicoes.ts):
--   aberto       -> em_andamento | resolvido
--   em_andamento -> resolvido
--   resolvido    -> em_andamento   (reabrir)

create function public.mudar_status_chamado(
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
    -- A avaliação do inquilino vale para a solução; reabrir descarta.
    avaliacao_nota = case when novo_status = 'resolvido' then c.avaliacao_nota end,
    avaliacao_comentario = case when novo_status = 'resolvido' then c.avaliacao_comentario end
  where c.id = chamado;

  insert into public.eventos_chamado (chamado_id, autor, status_anterior, status_novo, nota)
  values (chamado, 'proprietario', atual, novo_status, nullif(trim(nota), ''));
end;
$$;

revoke execute on function public.mudar_status_chamado(uuid, public.status_chamado, text, numeric) from public, anon;
grant execute on function public.mudar_status_chamado(uuid, public.status_chamado, text, numeric) to authenticated;
