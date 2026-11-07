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
-- Datas são relativas a agora: a demonstração continua "recente" sempre que
-- for carregada. Nenhum e-mail nem aviso é enviado ao carregar.

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
-- Imóveis (ids de310000-...-<n>)
-- ---------------------------------------------------------------------------

insert into public.imoveis (id, dono_id, apelido, logradouro, numero, complemento, bairro, criado_em, atualizado_em, arquivado_em)
select
  format('de310000-0000-4000-8000-%s', lpad(i.n::text, 12, '0'))::uuid,
  format('de300000-0000-4000-8000-%s', lpad(i.dono::text, 12, '0'))::uuid,
  i.apelido, i.logradouro, i.numero, i.complemento, i.bairro,
  now() - make_interval(days => i.desde), now() - make_interval(days => i.desde),
  now() - make_interval(days => i.arquivado)
from (values
  -- Marta
  (1, 1, 'Casa Pinheiros',         'Rua dos Pinheiros',         '812',  null,       'Pinheiros',     190, null),
  (2, 1, 'Apto Vila Mariana',      'Rua Domingos de Morais',    '1450', 'Apto 72',  'Vila Mariana',  185, null),
  (3, 1, 'Kitnet Bela Vista 3',    'Rua Treze de Maio',         '330',  'Kitnet 3', 'Bela Vista',    180, null),
  (4, 1, 'Kitnet Bela Vista 5',    'Rua Treze de Maio',         '330',  'Kitnet 5', 'Bela Vista',    180, null),
  (5, 1, 'Sobrado Mooca',          'Rua da Mooca',              '2210', null,       'Mooca',         195, null),
  (6, 1, 'Casa Butantã',           'Rua Alvarenga',             '905',  null,       'Butantã',       175, null),
  (7, 1, 'Apto Santana',           'Rua Voluntários da Pátria', '3100', 'Apto 41',  'Santana',       170, null),
  (8, 1, 'Casa Lapa',              'Rua Guaicurus',             '640',  null,       'Lapa',          200, 20),
  -- Jorge
  (9, 2, 'Casa Tatuapé',           'Rua Tuiuti',                '1200', null,       'Tatuapé',       150, null),
  (10, 2, 'Apto Vila Prudente',    'Avenida Paes de Barros',    '45',   'Apto 112', 'Vila Prudente', 140, null)
) as i (n, dono, apelido, logradouro, numero, complemento, bairro, desde, arquivado);

-- ---------------------------------------------------------------------------
-- Inquilinos (ids de320000-...-<n>). A Kitnet 5 está vaga: o Paulo saiu e
-- foi desativado, mas os chamados dele continuam no histórico.
-- ---------------------------------------------------------------------------

insert into public.inquilinos (id, imovel_id, nome, email, token_hash, ativo, criado_em, atualizado_em, ultimo_acesso_em)
select
  format('de320000-0000-4000-8000-%s', lpad(q.n::text, 12, '0'))::uuid,
  format('de310000-0000-4000-8000-%s', lpad(q.imovel::text, 12, '0'))::uuid,
  q.nome, q.email,
  encode(extensions.digest(rpad(q.token, 43, '0'), 'sha256'), 'hex'),
  q.ativo,
  now() - make_interval(days => q.desde), now() - make_interval(days => q.desde),
  now() - make_interval(hours => q.visto_ha_horas)
from (values
  (1,  1,  'Carla Mendes',   'carla@demo.zelo.test',    'demo-casa-pinheiros-carla',       true,  185, 2),
  (2,  1,  'Rafael Mendes',  null,                      'demo-casa-pinheiros-rafael',      true,  185, 70),
  (3,  2,  'Bruno Tavares',  'bruno@demo.zelo.test',    'demo-apto-vila-mariana-bruno',    true,  180, 20),
  (4,  3,  'Júlia Rocha',    'julia@demo.zelo.test',    'demo-kitnet-bela-vista-3-julia',  true,  175, 30),
  (5,  4,  'Paulo Nunes',    'paulo@demo.zelo.test',    'demo-kitnet-bela-vista-5-paulo',  false, 175, 600),
  (6,  5,  'Fernanda Lima',  'fernanda@demo.zelo.test', 'demo-sobrado-mooca-fernanda',     true,  190, 5),
  (7,  5,  'Marcos Lima',    'marcos@demo.zelo.test',   'demo-sobrado-mooca-marcos',       true,  190, 140),
  (8,  6,  'Lucas Ferreira', 'lucas@demo.zelo.test',    'demo-casa-butanta-lucas',         true,  170, 50),
  (9,  7,  'Helena Costa',   'helena@demo.zelo.test',   'demo-apto-santana-helena',        true,  165, 80),
  (10, 8,  'Sérgio Prado',   'sergio@demo.zelo.test',   'demo-casa-lapa-sergio',           true,  195, 500),
  (11, 9,  'Patrícia Gomes', 'patricia@demo.zelo.test', 'demo-casa-tatuape-patricia',      true,  145, 40),
  (12, 10, 'Renato Dias',    'renato@demo.zelo.test',   'demo-apto-vila-prudente-renato',  true,  135, 90)
) as q (n, imovel, nome, email, token, ativo, desde, visto_ha_horas);

-- ---------------------------------------------------------------------------
-- Chamados e histórico
-- ---------------------------------------------------------------------------

-- Os gatilhos abaixo mandariam e-mails e avisos e trocariam as datas por
-- "agora"; ficam desligados só durante a carga (voltam no fim do arquivo).
-- O que recusa chamado aberto em imóvel arquivado continua ligado.
alter table public.chamados disable trigger notificar_chamado_novo;
alter table public.chamados disable trigger chamados_resolvido_em;
alter table public.chamados disable trigger chamados_atualizado_em;
alter table public.eventos_chamado disable trigger avisar_inquilino_do_status;

-- Uma linha por chamado. Dias contados para trás a partir de agora:
-- criado, iniciado (passou para Em andamento) e resolvido; vazio = não aconteceu.
create temporary table demo_chamados on commit drop as
select
  gen_random_uuid() as id,
  format('de310000-0000-4000-8000-%s', lpad(c.imovel::text, 12, '0'))::uuid as imovel_id,
  format('de320000-0000-4000-8000-%s', lpad(c.inquilino::text, 12, '0'))::uuid as inquilino_id,
  c.categoria::public.categoria_chamado as categoria,
  c.descricao, c.urgente, c.horario,
  -- Horas variadas no dia, sempre no passado.
  now() - make_interval(days => c.criado, hours => 2 + c.criado % 7) as criado_em,
  now() - make_interval(days => c.iniciado, hours => 1 + c.iniciado % 3) as iniciado_em,
  now() - make_interval(days => c.resolvido) as resolvido_em,
  c.valor, c.nota, c.comentario, c.recado_inicio, c.recado_fim
from (values
  -- Novos
  (1, 1, 'hidraulica', 'Vazamento embaixo da pia da cozinha. O armário já está com a madeira estufada.', true, 'Qualquer horário', 0, null, null, null, null, null, null, null),
  (2, 3, 'eletrica', 'A tomada da sala soltou faísca quando liguei o aspirador e agora não funciona mais.', true, 'Depois das 18h', 1, null, null, null, null, null, null, null),
  (3, 4, 'eletrica', 'O chuveiro só esquenta na posição verão.', false, 'Depois das 19h', 1, null, null, null, null, null, null, null),
  (6, 8, 'telhado', 'Calha entupida com folhas: transborda quando chove forte.', false, 'Sábado de manhã', 2, null, null, null, null, null, null, null),
  (7, 9, 'outros', 'A porta do armário do banheiro caiu, a dobradiça quebrou.', false, null, 3, null, null, null, null, null, null, null),
  (5, 6, 'hidraulica', 'A descarga do banheiro de cima fica correndo água sem parar.', false, 'De manhã', 4, null, null, null, null, null, null, null),
  -- Em andamento
  (5, 7, 'telhado', 'Goteira no quarto dos fundos quando chove. Já coloquei um balde.', true, 'Qualquer horário', 6, 5, null, null, null, null, 'O telhadista vem quinta às 9h.', null),
  (1, 2, 'eletrica', 'O disjuntor do chuveiro desarma toda hora.', true, null, 3, 2, null, null, null, null, 'Eletricista confirmado para amanhã de manhã.', null),
  (2, 3, 'outros', 'O interfone não toca no apartamento.', false, 'Depois das 18h', 9, 7, null, null, null, null, 'Pedi orçamento para a empresa do interfone.', null),
  (7, 9, 'hidraulica', 'A torneira do tanque está pingando.', false, 'De manhã', 5, 4, null, null, null, null, null, null),
  (6, 8, 'outros', 'O portão da garagem está emperrando para abrir.', false, 'Fim de semana', 12, 10, null, null, null, null, 'O serralheiro passa no sábado.', null),
  (3, 4, 'telhado', 'Mancha de umidade no teto do banheiro.', false, null, 8, 6, null, null, null, null, null, null),
  -- Resolvidos nos últimos 30 dias (aparecem no quadro)
  (3, 4, 'hidraulica', 'Vazamento no sifão da pia do banheiro.', true, 'Qualquer horário', 10, 10, 9, 85, 5, null, null, 'Sifão trocado.'),
  (1, 1, 'hidraulica', 'O ralo do box entupiu e a água acumula no banho.', false, 'De manhã', 14, 13, 11, 180, 5, 'Resolveram rápido, obrigada!', null, 'A desentupidora resolveu.'),
  (7, 9, 'eletrica', 'A campainha parou de funcionar.', false, null, 15, null, 14, 60, null, null, null, null),
  (2, 3, 'eletrica', 'A lâmpada da área de serviço não acende nem trocando.', false, null, 18, 17, 16, 95, 4, null, null, 'Era o interruptor; já foi trocado.'),
  (6, 8, 'hidraulica', 'Pressão da água muito fraca no chuveiro.', false, null, 25, 24, 19, 260, 3, 'Melhorou, mas demorou.', null, 'Trocado o registro.'),
  (5, 6, 'outros', 'A fechadura da porta da frente está travando.', false, 'Depois das 18h', 22, 21, 20, 140, 5, 'Chaveiro muito educado.', null, 'Fechadura trocada; deixei duas cópias da chave.'),
  (1, 1, 'telhado', 'Telha quebrada depois do temporal.', true, null, 27, 27, 25, 350, 5, 'Vieram no mesmo dia!', 'O telhadista vem hoje à tarde.', 'Troca de 6 telhas e revisão do telhado.'),
  (4, 5, 'outros', 'A janela do quarto não fecha direito.', false, null, 29, 27, 26, 120, 4, null, null, 'Esquadria ajustada.'),
  -- Resolvidos há mais tempo
  (5, 6, 'eletrica', 'O quadro de luz está com cheiro de queimado.', true, null, 40, 40, 39, 890, 5, 'Ótimo atendimento, me senti segura.', 'Desligue o disjuntor geral; o eletricista chega em 1 hora.', 'Trocados os disjuntores e a fiação do quadro.'),
  (1, 1, 'eletrica', 'O ventilador de teto do quarto está fazendo barulho.', false, null, 45, 44, 42, 150, 4, null, null, null),
  (6, 8, 'eletrica', 'A luz da garagem fica piscando.', false, null, 55, null, 54, 45, null, null, null, null),
  (3, 4, 'eletrica', 'Tomada do quarto sem energia.', false, null, 60, 58, 57, 70, 5, null, null, null),
  (1, 2, 'outros', 'A mola do portão social quebrou.', false, null, 70, 69, 66, 110, null, null, null, null),
  (7, 9, 'outros', 'Mofo na parede do quarto, perto da janela.', false, null, 75, 73, 68, 480, 4, 'A parede ficou nova.', null, 'Tratamento antimofo e pintura.'),
  (5, 7, 'hidraulica', 'O aquecedor a gás não liga.', true, null, 85, 84, 83, 420, 4, null, null, 'Trocada a válvula do aquecedor.'),
  (2, 3, 'hidraulica', 'Infiltração vindo do apartamento de cima.', true, null, 95, 94, 80, 1200, 4, 'Demorou por causa do vizinho, mas resolveu.', 'Falei com o síndico; o vizinho vai liberar a visita.', 'Conserto feito com o síndico; pintura do teto inclusa.'),
  (4, 5, 'hidraulica', 'A caixa acoplada está vazando no chão.', false, null, 100, 99, 97, 230, 3, 'Ficou bom, mas sujaram o banheiro.', null, null),
  (3, 4, 'outros', 'A porta de entrada está raspando no chão.', false, null, 110, 109, 108, 90, null, null, null, null),
  (6, 8, 'telhado', 'Rufo solto na lateral da casa.', false, null, 120, 118, 115, 300, 5, null, null, null),
  (2, 3, 'outros', 'O trilho do box do banheiro soltou.', false, null, 130, 128, 125, 180, 5, null, null, null),
  (7, 9, 'hidraulica', 'O registro do banheiro quebrou.', false, null, 140, 139, 138, 160, 5, null, null, null),
  (4, 5, 'telhado', 'Infiltração no forro de gesso da sala.', false, null, 150, 148, 140, 680, null, null, null, 'Impermeabilização da laje.'),
  (5, 6, 'outros', 'Cupim no batente da porta da cozinha.', false, null, 170, 165, 160, 550, 4, null, null, 'Dedetização e troca do batente.'),
  -- Casa Lapa (arquivada): só chamados resolvidos
  (8, 10, 'hidraulica', 'Cano estourado na área externa.', true, null, 160, 160, 159, 380, 4, null, null, null),
  (8, 10, 'eletrica', 'O chuveiro queimou.', false, null, 90, 89, 88, 120, 5, null, null, null),
  (8, 10, 'outros', 'Vistoria de saída: pintura e pequenos reparos.', false, null, 35, 30, 22, 1500, null, null, null, 'Imóvel entregue com pintura completa.'),
  -- Jorge
  (9, 11, 'hidraulica', 'A pia da cozinha entupiu.', false, 'De manhã', 2, null, null, null, null, null, null, null),
  (10, 12, 'telhado', 'Goteira na varanda.', true, 'Qualquer horário', 4, 3, null, null, null, null, 'Já chamei o telhadista.', null),
  (10, 12, 'outros', 'O portão eletrônico parou de abrir.', false, null, 20, 19, 18, 250, 5, null, null, 'Motor do portão trocado.'),
  (9, 11, 'eletrica', 'A lâmpada do banheiro queima toda semana.', false, null, 40, 38, 37, 80, 4, null, null, 'Era mau contato no soquete.')
) as c (imovel, inquilino, categoria, descricao, urgente, horario, criado, iniciado, resolvido, valor, nota, comentario, recado_inicio, recado_fim);

insert into public.chamados (
  id, imovel_id, inquilino_id, categoria, descricao, urgente, melhor_horario, status,
  valor, resolvido_em, avaliacao_nota, avaliacao_comentario, criado_em, atualizado_em
)
select
  d.id, d.imovel_id, d.inquilino_id, d.categoria, d.descricao, d.urgente, d.horario,
  case
    when d.resolvido_em is not null then 'resolvido'
    when d.iniciado_em is not null then 'em_andamento'
    else 'aberto'
  end::public.status_chamado,
  d.valor, d.resolvido_em, d.nota, d.comentario, d.criado_em,
  coalesce(d.resolvido_em, d.iniciado_em, d.criado_em)
from demo_chamados d;

-- Histórico de cada chamado, como o app grava: o inquilino abre, o dono
-- inicia e resolve (com recado), e o inquilino avalia no dia seguinte.
insert into public.eventos_chamado (chamado_id, autor, status_anterior, status_novo, nota, criado_em)
select id, 'inquilino'::public.autor_evento, null::public.status_chamado, 'aberto'::public.status_chamado,
       null::text, criado_em
from demo_chamados
union all
select id, 'proprietario', 'aberto', 'em_andamento', recado_inicio, iniciado_em
from demo_chamados where iniciado_em is not null
union all
select id, 'proprietario',
       case when iniciado_em is null then 'aberto' else 'em_andamento' end::public.status_chamado,
       'resolvido', recado_fim, resolvido_em
from demo_chamados where resolvido_em is not null
union all
select id, 'inquilino', null, null,
       format('Nota %s de 5.%s', nota, coalesce(' ' || comentario, '')),
       resolvido_em + interval '1 day'
from demo_chamados where nota is not null;

alter table public.chamados enable trigger notificar_chamado_novo;
alter table public.chamados enable trigger chamados_resolvido_em;
alter table public.chamados enable trigger chamados_atualizado_em;
alter table public.eventos_chamado enable trigger avisar_inquilino_do_status;

commit;
