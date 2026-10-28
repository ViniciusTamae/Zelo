# Atalhos: tudo roda dentro do container dev (só precisa de Docker no PC).
export DOCKER_GID := $(shell getent group docker | cut -d: -f3)
export PWD := $(CURDIR)

RUN := docker compose run --rm dev

.PHONY: build sh install dev lint test test-db test-e2e test-all db-start db-stop db-status db-reset db-types db-new prod

build:      ## Constrói a imagem de desenvolvimento
	docker compose build dev

sh:         ## Abre um shell no container
	$(RUN) bash

install:    ## Instala as dependências
	$(RUN) pnpm install

dev:        ## Sobe o Next.js em http://localhost:3000
	docker compose up dev

lint:       ## ESLint + checagem de tipos
	$(RUN) sh -c "pnpm lint && pnpm typecheck"

test:       ## Testes unitários (Vitest)
	$(RUN) pnpm test

test-db:    ## Testes do banco: RLS e triggers (pgTAP; precisa do db-start)
	$(RUN) pnpm test:db

test-e2e:   ## Testes no navegador (Playwright; precisa do db-start)
	$(RUN) pnpm test:e2e

test-all: lint test test-db test-e2e  ## Roda tudo

db-start:   ## Sobe o Supabase local
	$(RUN) pnpm db:start

db-stop:
	$(RUN) pnpm db:stop

db-status:  ## Mostra URLs e chaves do Supabase local
	$(RUN) pnpm supabase status

db-reset:   ## Recria o banco local aplicando todas as migrações
	$(RUN) pnpm db:reset

db-types:   ## Gera src/lib/supabase/database.types.ts
	$(RUN) pnpm db:types

db-new:     ## Cria migração: make db-new nome=descricao
	$(RUN) pnpm supabase migration new $(nome)

prod:       ## Builda e sobe a imagem de produção (lê .env.local)
	docker compose --env-file .env.local --profile prod up --build app
