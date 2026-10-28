-- "Perdi meu link": o inquilino informa o e-mail e recebe um link novo.
-- O e-mail é comparado sempre em minúsculas, e cada inquilino só pode pedir
-- um reenvio a cada poucos minutos (link_reenviado_em), para ninguém ficar
-- trocando o link de outra pessoa sem parar só por saber o e-mail dela.

update public.inquilinos
set email = lower(trim(email))
where email is not null and email <> lower(trim(email));

alter table public.inquilinos
  add constraint inquilinos_email_minusculo check (email = lower(trim(email))),
  add column link_reenviado_em timestamptz;

-- Busca pelo e-mail no "Perdi meu link" (só inquilinos ativos recebem).
create index inquilinos_email_ativos_idx on public.inquilinos (email) where ativo;
