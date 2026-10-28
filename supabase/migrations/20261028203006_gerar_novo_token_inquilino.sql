-- Gera um novo link (token) para o inquilino: o link antigo para de funcionar na hora.
-- Uso: link perdido ou compartilhado com quem não devia.
--
-- security invoker: roda com as permissões de quem chama, então o RLS de
-- inquilinos garante que o proprietário só troca o token dos próprios inquilinos.
-- Devolve o token novo, ou null se o inquilino não existe ou é de outro dono.
create function public.gerar_novo_token_inquilino(inquilino uuid)
returns text
language sql
security invoker
set search_path = ''
as $$
  update public.inquilinos
  set token = encode(extensions.gen_random_bytes(32), 'hex')
  where id = inquilino
  returning token;
$$;

revoke execute on function public.gerar_novo_token_inquilino(uuid) from public, anon;
grant execute on function public.gerar_novo_token_inquilino(uuid) to authenticated;
