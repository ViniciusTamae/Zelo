-- Usado por `make avisos-config` (Supabase local): grava no Vault onde estão
-- as Edge Functions e o segredo que a função entregar-notificacoes confere.
-- Na nuvem, rode o mesmo no SQL Editor com a URL e o segredo de produção.
delete from vault.secrets where name in ('funcoes_url', 'notificacoes_segredo');
select vault.create_secret(:'url', 'funcoes_url');
select vault.create_secret(:'segredo', 'notificacoes_segredo');
