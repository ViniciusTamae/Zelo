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

## Imagem de produção

```bash
make prod   # builda o Dockerfile (output standalone) e sobe em http://localhost:3000
```

As variáveis `NEXT_PUBLIC_*` são embutidas no build; as demais são lidas em tempo de execução.
