-- Dados de demonstração do Zelo: dois proprietários com imóveis, inquilinos e
-- chamados dos últimos 6 meses, para apresentar o app com volume.
--
-- Carrega sozinho no `make db-reset` e, sem apagar mais nada, com `make seed`.
-- Pode rodar de novo: apaga e recria só os dados de demonstração.
--
-- Entrar (o código de 6 dígitos chega no Mailpit, http://localhost:54324):
--   marta@zelo.local  -> Marta Oliveira, 8 imóveis (1 arquivado), ~40 chamados
--   jorge@zelo.local  -> Jorge Santos, 2 imóveis
--
-- Links dos inquilinos (http://localhost:3000/c/<token>):
--   Carla, Casa Pinheiros        demo-casa-pinheiros-carla000000000000000000
--   Bruno, Apto Vila Mariana     demo-apto-vila-mariana-bruno000000000000000
--   Fernanda, Sobrado Mooca      demo-sobrado-mooca-fernanda0000000000000000
--   Helena, Apto Santana         demo-apto-santana-helena0000000000000000000
--   Patrícia (Jorge), Tatuapé    demo-casa-tatuape-patricia00000000000000000
-- O token de cada inquilino é rpad('demo-<imovel>-<nome>', 43, '0'): o banco
-- guarda só o hash, como faz o app.
--
-- Os imóveis, inquilinos e chamados vêm de public.criar_dados_demonstracao
-- (migração demonstracao_por_visitante), a mesma que preenche a conta de cada
-- visitante na demonstração da Vercel. Datas relativas a agora: os dados
-- continuam "recentes" sempre que forem carregados. Nenhum e-mail nem aviso
-- é enviado ao carregar.

begin;

-- ---------------------------------------------------------------------------
-- Recomeça do zero (só os dados de demonstração; o resto vai em cascata)
-- ---------------------------------------------------------------------------

delete from auth.users
where id in ('de300000-0000-4000-8000-000000000001', 'de300000-0000-4000-8000-000000000002');

-- ---------------------------------------------------------------------------
-- Proprietários (o trigger ao_criar_usuario cria o registro em proprietarios)
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '',
  now() - interval '200 days',
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object('nome', u.nome),
  now() - interval '200 days', now() - interval '200 days',
  '', '', '', ''
from (values
  ('de300000-0000-4000-8000-000000000001'::uuid, 'marta@zelo.local', 'Marta Oliveira'),
  ('de300000-0000-4000-8000-000000000002'::uuid, 'jorge@zelo.local', 'Jorge Santos')
) as u (id, email, nome);

-- Identidade de e-mail: sem ela o login por código não acha a conta.
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', u.created_at, u.created_at
from auth.users u
where u.id in ('de300000-0000-4000-8000-000000000001', 'de300000-0000-4000-8000-000000000002');


-- ---------------------------------------------------------------------------
-- Imóveis, inquilinos, chamados e histórico (com os tokens conhecidos acima)
-- ---------------------------------------------------------------------------

select public.criar_dados_demonstracao('de300000-0000-4000-8000-000000000001', 'marta', true);
select public.criar_dados_demonstracao('de300000-0000-4000-8000-000000000002', 'jorge', true);

commit;
