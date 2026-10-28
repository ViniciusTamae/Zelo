-- O banco deixa de guardar o token puro do link /c/[token]: guarda só o hash
-- SHA-256 (hex). O token é gerado no servidor do Next.js e mostrado ao dono
-- uma única vez; quem tiver acesso ao banco não consegue montar os links.
-- Também registra quando o inquilino abriu o link pela última vez.

alter table public.inquilinos
  add column token_hash text,
  add column ultimo_acesso_em timestamptz;

-- Links já enviados continuam valendo: o hash é calculado do token atual.
update public.inquilinos
set token_hash = encode(extensions.digest(token, 'sha256'), 'hex');

alter table public.inquilinos
  alter column token_hash set not null,
  add constraint inquilinos_token_hash_formato check (token_hash ~ '^[0-9a-f]{64}$'),
  add constraint inquilinos_token_hash_key unique (token_hash);

alter table public.inquilinos drop column token;

-- "Gerar novo link" agora é um update do token_hash feito pelo app (com RLS).
drop function public.gerar_novo_token_inquilino(uuid);
