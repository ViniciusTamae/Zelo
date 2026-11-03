-- Excluir ou arquivar imóvel.
-- Sem chamados, o imóvel é excluído de vez (com os inquilinos, em cascata).
-- Com chamados, é arquivado: some da lista, os links dos inquilinos param de
-- funcionar e o histórico e os gastos continuam guardados. Com chamado em
-- aberto, nem um nem outro: o proprietário resolve antes.

alter table public.imoveis add column arquivado_em timestamptz;

-- Imóvel arquivado não tem chamado em aberto: não recebe chamado novo nem
-- reabre um resolvido. O app já recusa o link do inquilino; esta é a última
-- barreira (vale também para a service role).
create function public.recusar_chamado_aberto_em_imovel_arquivado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'resolvido' and exists (
    select 1 from public.imoveis i where i.id = new.imovel_id and i.arquivado_em is not null
  ) then
    raise exception 'Imóvel arquivado não tem chamados em aberto.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger chamados_imovel_arquivado
  before insert or update of status on public.chamados
  for each row execute function public.recusar_chamado_aberto_em_imovel_arquivado();

-- Decide e faz numa transação só. Roda com as permissões de quem chama (RLS):
-- o proprietário só enxerga e mexe nos próprios imóveis.
-- Devolve 'excluido' ou 'arquivado'.
create function public.excluir_ou_arquivar_imovel(imovel uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  total integer;
  abertos integer;
begin
  perform 1 from public.imoveis i where i.id = imovel and i.arquivado_em is null for update;
  if not found then
    raise exception 'Imóvel não encontrado.' using errcode = 'P0002';
  end if;

  select count(*), count(*) filter (where c.status <> 'resolvido')
  into total, abertos
  from public.chamados c
  where c.imovel_id = imovel;

  if abertos > 0 then
    raise exception 'O imóvel tem % chamado(s) em aberto.', abertos using errcode = '22023';
  end if;

  if total = 0 then
    delete from public.imoveis i where i.id = imovel;
    return 'excluido';
  end if;

  update public.imoveis i set arquivado_em = now() where i.id = imovel;
  return 'arquivado';
end;
$$;
