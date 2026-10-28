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
make db-reset                # recria o banco local aplicando todas as migrações
make db-types                # regenera src/lib/supabase/database.types.ts
```

## E-mails do login

No local, o Supabase Auth entrega os e-mails no Mailpit (http://localhost:54324). O modelo do e-mail com o código fica em `supabase/templates/codigo-acesso.html`.

Em produção, o envio passa pelo Resend (o SMTP padrão do Supabase tem limite baixo de envios):

1. No Resend, verificar o domínio (registros DNS) e criar uma API key.
2. No painel do Supabase Cloud, em Authentication → SMTP Settings: host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a API key e remetente com o domínio verificado. O bloco `[auth.email.smtp]` comentado em `supabase/config.toml` tem os mesmos valores.
3. Conferir que o modelo do e-mail e o `site_url` do projeto apontam para o endereço publicado.

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
