-- Zelo — esquema inicial
-- Tabelas do MVP, RLS em todas e bucket privado de fotos.
-- Regra geral: o proprietário só enxerga dados dos próprios imóveis (dono_id = auth.uid()).
-- O inquilino não tem conta: o servidor do Next.js acessa em nome dele com a service role.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.categoria_chamado as enum ('hidraulica', 'eletrica', 'telhado', 'outros');
create type public.status_chamado as enum ('aberto', 'em_andamento', 'resolvido');
create type public.autor_evento as enum ('proprietario', 'inquilino', 'sistema');
create type public.destino_notificacao as enum ('proprietario', 'inquilino');

-- ---------------------------------------------------------------------------
-- Funções utilitárias
-- ---------------------------------------------------------------------------

-- Mantém a coluna atualizado_em em dia.
create function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- proprietarios
-- ---------------------------------------------------------------------------

create table public.proprietarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  -- Horário de silêncio, interpretado no fuso America/Sao_Paulo.
  silencio_inicio time not null default '21:00',
  silencio_fim time not null default '08:00',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger proprietarios_atualizado_em
  before update on public.proprietarios
  for each row execute function public.definir_atualizado_em();

-- Cria o proprietário automaticamente quando alguém se cadastra no Auth.
create function public.criar_proprietario_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.proprietarios (id, nome)
  values (new.id, new.raw_user_meta_data ->> 'nome');
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_proprietario_para_novo_usuario();

-- ---------------------------------------------------------------------------
-- imoveis
-- ---------------------------------------------------------------------------

create table public.imoveis (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references public.proprietarios (id) on delete cascade,
  apelido text not null check (length(trim(apelido)) > 0),
  endereco text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index imoveis_dono_id_idx on public.imoveis (dono_id);

create trigger imoveis_atualizado_em
  before update on public.imoveis
  for each row execute function public.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- inquilinos
-- ---------------------------------------------------------------------------

create table public.inquilinos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references public.imoveis (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  -- LGPD: só o e-mail, usado para avisar sobre o andamento dos chamados.
  email text,
  -- Token do link exclusivo /c/[token]: 64 caracteres hexadecimais aleatórios.
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- Permite a FK composta em chamados (inquilino precisa ser do mesmo imóvel).
  unique (id, imovel_id)
);

create index inquilinos_imovel_id_idx on public.inquilinos (imovel_id);

create trigger inquilinos_atualizado_em
  before update on public.inquilinos
  for each row execute function public.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- chamados
-- ---------------------------------------------------------------------------

create table public.chamados (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references public.imoveis (id) on delete cascade,
  inquilino_id uuid,
  categoria public.categoria_chamado not null,
  descricao text not null check (length(trim(descricao)) > 0),
  -- Caminho no bucket fotos-chamados: <imovel_id>/<chamado_id>/<arquivo>.
  foto_path text,
  urgente boolean not null default false,
  melhor_horario text,
  status public.status_chamado not null default 'aberto',
  valor numeric(10, 2) check (valor >= 0),
  resolvido_em timestamptz,
  avaliacao_nota smallint check (avaliacao_nota between 1 and 5),
  avaliacao_comentario text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- O inquilino que abriu precisa morar no mesmo imóvel do chamado.
  -- Se o inquilino for apagado, o chamado fica no histórico sem ele.
  foreign key (inquilino_id, imovel_id)
    references public.inquilinos (id, imovel_id)
    on delete set null (inquilino_id),
  -- Só dá para avaliar chamado resolvido.
  check (avaliacao_nota is null or status = 'resolvido')
);

create index chamados_imovel_id_idx on public.chamados (imovel_id);
create index chamados_inquilino_id_idx on public.chamados (inquilino_id);

create trigger chamados_atualizado_em
  before update on public.chamados
  for each row execute function public.definir_atualizado_em();

-- Preenche resolvido_em quando o status vira "resolvido" e limpa se for reaberto.
create function public.definir_resolvido_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'resolvido' and (tg_op = 'INSERT' or old.status <> 'resolvido') then
    new.resolvido_em := now();
  elsif new.status <> 'resolvido' then
    new.resolvido_em := null;
  end if;
  return new;
end;
$$;

create trigger chamados_resolvido_em
  before insert or update of status on public.chamados
  for each row execute function public.definir_resolvido_em();

-- ---------------------------------------------------------------------------
-- eventos_chamado (histórico imutável)
-- ---------------------------------------------------------------------------

create table public.eventos_chamado (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  autor public.autor_evento not null,
  status_anterior public.status_chamado,
  status_novo public.status_chamado,
  nota text,
  criado_em timestamptz not null default now(),
  check (status_novo is not null or nota is not null)
);

create index eventos_chamado_chamado_id_idx on public.eventos_chamado (chamado_id);

-- ---------------------------------------------------------------------------
-- notificacoes (fila lida pela Edge Function a cada 5 min)
-- ---------------------------------------------------------------------------

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  destino public.destino_notificacao not null,
  proprietario_id uuid references public.proprietarios (id) on delete cascade,
  inquilino_id uuid references public.inquilinos (id) on delete cascade,
  chamado_id uuid references public.chamados (id) on delete cascade,
  tipo text not null,
  entregar_em timestamptz not null default now(),
  enviada boolean not null default false,
  enviada_em timestamptz,
  criado_em timestamptz not null default now(),
  check (
    (destino = 'proprietario' and proprietario_id is not null and inquilino_id is null)
    or (destino = 'inquilino' and inquilino_id is not null and proprietario_id is null)
  )
);

create index notificacoes_pendentes_idx on public.notificacoes (entregar_em) where not enviada;
create index notificacoes_proprietario_id_idx on public.notificacoes (proprietario_id);
create index notificacoes_inquilino_id_idx on public.notificacoes (inquilino_id);
create index notificacoes_chamado_id_idx on public.notificacoes (chamado_id);

-- ---------------------------------------------------------------------------
-- push_inscricoes (Web Push, uma por dispositivo do proprietário)
-- ---------------------------------------------------------------------------

create table public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  proprietario_id uuid not null references public.proprietarios (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);

create index push_inscricoes_proprietario_id_idx on public.push_inscricoes (proprietario_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.proprietarios enable row level security;
alter table public.imoveis enable row level security;
alter table public.inquilinos enable row level security;
alter table public.chamados enable row level security;
alter table public.eventos_chamado enable row level security;
alter table public.notificacoes enable row level security;
alter table public.push_inscricoes enable row level security;

-- proprietarios: cada um lê e edita só o próprio registro (a criação é pelo trigger).
create policy "proprietario le o proprio registro"
  on public.proprietarios for select to authenticated
  using (id = (select auth.uid()));

create policy "proprietario edita o proprio registro"
  on public.proprietarios for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- imoveis
create policy "proprietario gerencia os proprios imoveis"
  on public.imoveis for all to authenticated
  using (dono_id = (select auth.uid()))
  with check (dono_id = (select auth.uid()));

-- inquilinos
create policy "proprietario gerencia inquilinos dos seus imoveis"
  on public.inquilinos for all to authenticated
  using (imovel_id in (select id from public.imoveis where dono_id = (select auth.uid())))
  with check (imovel_id in (select id from public.imoveis where dono_id = (select auth.uid())));

-- chamados
create policy "proprietario gerencia chamados dos seus imoveis"
  on public.chamados for all to authenticated
  using (imovel_id in (select id from public.imoveis where dono_id = (select auth.uid())))
  with check (imovel_id in (select id from public.imoveis where dono_id = (select auth.uid())));

-- eventos_chamado: leitura e inclusão; o histórico não é editado nem apagado.
create policy "proprietario le eventos dos seus chamados"
  on public.eventos_chamado for select to authenticated
  using (chamado_id in (
    select c.id from public.chamados c
    join public.imoveis i on i.id = c.imovel_id
    where i.dono_id = (select auth.uid())
  ));

create policy "proprietario registra eventos dos seus chamados"
  on public.eventos_chamado for insert to authenticated
  with check (
    autor = 'proprietario'
    and chamado_id in (
      select c.id from public.chamados c
      join public.imoveis i on i.id = c.imovel_id
      where i.dono_id = (select auth.uid())
    )
  );

-- notificacoes: sem políticas; só a service role (servidor e Edge Functions) acessa.

-- push_inscricoes
create policy "proprietario gerencia as proprias inscricoes push"
  on public.push_inscricoes for all to authenticated
  using (proprietario_id = (select auth.uid()))
  with check (proprietario_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: fotos dos chamados (bucket privado, acesso por URL assinada)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-chamados',
  'fotos-chamados',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
);

-- O proprietário só lê fotos cuja primeira pasta é um imóvel dele.
-- O upload do inquilino é feito pelo servidor com a service role.
create policy "proprietario le fotos dos seus imoveis"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos-chamados'
    and (storage.foldername(name))[1] in (
      select id::text from public.imoveis where dono_id = (select auth.uid())
    )
  );
