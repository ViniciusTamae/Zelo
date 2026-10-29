# Zelo

Centraliza os pedidos de conserto entre o pequeno proprietário e seus inquilinos.

Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres, Auth, Storage, Edge Functions) e pnpm.

## Desenvolvimento (só precisa de Docker)

Tudo roda dentro do container `dev` (Node 24 + pnpm + Supabase CLI). Os atalhos estão no `Makefile`:

```bash
make build       # constrói a imagem de desenvolvimento (uma vez)
make install     # instala as dependências
make db-start    # sobe o Supabase local (Postgres, Auth, Storage, Studio...)
make db-status   # mostra URLs e chaves locais
cp .env.example .env.local   # e preencha com as chaves do db-status
make dev         # Next.js em http://localhost:3000
make sh          # shell dentro do container
```

URLs locais:

- App: http://localhost:3000 (health: `/api/health`)
- Supabase Studio: http://localhost:54323
- E-mails de teste (Mailpit): http://localhost:54324

> O container usa a rede do host e o Docker do host (para o `supabase start` criar os containers do Supabase). Funciona em Linux.

## Banco de dados

As migrações ficam em `supabase/migrations` e são a única forma de mudar o esquema (nada pelo painel).

```bash
make db-new nome=descricao   # cria uma migração nova
make db-migrate              # aplica só as migrações novas (mantém os dados)
make db-reset                # recria o banco local do zero (APAGA os dados locais)
make db-types                # regenera src/lib/supabase/database.types.ts
```

## E-mails

Os e-mails que o próprio app manda (ex.: "Perdi meu link" do inquilino) usam a API do Resend quando `RESEND_API_KEY` está definida; sem ela, vão para o Mailpit local (`MAILPIT_URL`). O remetente vem de `RESEND_FROM`.

### E-mails do login

No local, o Supabase Auth entrega os e-mails no Mailpit (http://localhost:54324). O modelo do e-mail com o código fica em `supabase/templates/codigo-acesso.html`.

Em produção, o envio passa pelo Resend (o SMTP padrão do Supabase tem limite baixo de envios):

1. No Resend, verificar o domínio (registros DNS) e criar uma API key.
2. No painel do Supabase Cloud, em Authentication → SMTP Settings: host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a API key e remetente com o domínio verificado. O bloco `[auth.email.smtp]` comentado em `supabase/config.toml` tem os mesmos valores.
3. Conferir que o modelo do e-mail e o `site_url` do projeto apontam para o endereço publicado.

## Avisos no celular (Web Push)

Quando chega um chamado, o proprietário recebe um aviso no celular. Das 21h às 8h (ajustável em Ajustes), só os urgentes avisam na hora; os outros chegam quando o silêncio termina.

- O banco decide quando avisar (`calcular_entrega`, fuso de São Paulo) e chama a Edge Function `entregar-notificacoes` na hora (pg_net). O pg_cron chama a mesma função a cada 5 minutos para os avisos que estavam esperando e para tentar de novo os que falharam.
- Segredos locais: `supabase/functions/.env` (modelo em `supabase/functions/.env.example`) e a chave pública em `NEXT_PUBLIC_VAPID_PUBLIC_KEY` no `.env.local`.
- O banco precisa saber onde estão as funções e qual é o segredo: `make avisos-config` grava isso no Vault (o `make db-reset` já roda sozinho).
- Função nova em `supabase/functions` só aparece depois de `make db-stop && make db-start`.
- Para testar um aviso de verdade no seu computador: Chrome em http://localhost:3000 → Ajustes → "Ligar avisos neste aparelho" → "Enviar aviso de teste". No celular, só depois de publicar (o navegador exige HTTPS); no iPhone, com o Zelo na Tela de Início.

Na nuvem (ao publicar):

1. `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:... NOTIFICACOES_SEGREDO=...`
2. `supabase functions deploy entregar-notificacoes`
3. No SQL Editor, o conteúdo de `supabase/avisos-config.sql` trocando `:'url'` por `'https://<projeto>.supabase.co/functions/v1'` e `:'segredo'` pelo mesmo `NOTIFICACOES_SEGREDO`.
4. Na Vercel, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` com a mesma chave pública.

## Testes

```bash
make test       # unitários (Vitest): regras das Server Actions e do proxy, sem banco
make test-db    # banco (pgTAP): RLS e triggers — precisa do db-start
make test-e2e   # navegador (Playwright, tela de celular) — precisa do db-start
make test-all   # lint + tipos + todos os testes
```

Os testes E2E leem o código de acesso no Mailpit e usam um e-mail `e2e-...@zelo.test` diferente a cada execução. Ao terminar, esvaziam o Mailpit e apagam os usuários `e2e-` que criaram. Para esvaziar a caixa à mão: `make mail-clear`.

## Imagem de produção

```bash
make prod   # builda o Dockerfile (output standalone) e sobe em http://localhost:3000
```

As variáveis `NEXT_PUBLIC_*` são embutidas no build; as demais são lidas em tempo de execução.
