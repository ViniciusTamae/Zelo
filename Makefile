# Atalhos: tudo roda dentro do container dev (só precisa de Docker no PC).
export DOCKER_GID := $(shell getent group docker | cut -d: -f3)
export PWD := $(CURDIR)

RUN := docker compose run --rm dev

.PHONY: build sh install dev lint test test-db test-e2e test-all mail-clear db-start db-stop db-status db-reset db-migrate avisos-config db-types db-new prod

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

db-reset:   ## Recria o banco local do zero (APAGA os dados locais)
	$(RUN) pnpm db:reset
	$(MAKE) avisos-config

db-migrate: ## Aplica só as migrações novas, sem apagar os dados locais
	$(RUN) pnpm supabase migration up --local

avisos-config: ## Grava no Vault do banco local a URL das funções e o segredo dos avisos
	@segredo=$$(grep '^NOTIFICACOES_SEGREDO=' supabase/functions/.env | cut -d= -f2-); \
	docker exec -i supabase_db_zelo psql -q -U postgres -v ON_ERROR_STOP=1 \
	  -v url='http://supabase_kong_zelo:8000/functions/v1' -v segredo="$$segredo" < supabase/avisos-config.sql && \
	echo "Vault configurado (funcoes_url e notificacoes_segredo)."

db-types:   ## Gera src/lib/supabase/database.types.ts
	$(RUN) pnpm db:types

mail-clear: ## Esvazia a caixa de e-mails de teste (Mailpit)
	$(RUN) curl -s -X DELETE http://localhost:54324/api/v1/messages

db-new:     ## Cria migração: make db-new nome=descricao
	$(RUN) pnpm supabase migration new $(nome) < /dev/null  # sem isso, o CLI espera SQL pelo stdin

prod:       ## Builda e sobe a imagem de produção (lê .env.local)
	docker compose --env-file .env.local --profile prod up --build app
