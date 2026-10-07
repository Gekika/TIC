# Shortcuts for common tasks. Run `make help` to list them.
.DEFAULT_GOAL := help
COMPOSE := docker compose

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# --- Full stack (Docker) -----------------------------------------------------
up: ## Build and start postgres + backend + frontend
	$(COMPOSE) up -d --build

up-mail: ## Same as `up` plus the Mailpit test inbox (http://localhost:8025)
	$(COMPOSE) --profile mail up -d --build

down: ## Stop all containers (data is kept)
	$(COMPOSE) --profile mail down

ps: ## Show container status
	$(COMPOSE) ps

logs: ## Follow backend logs
	$(COMPOSE) logs -f --tail=200 backend

deploy: ## Server: git pull + backup + rebuild + restart
	./scripts/deploy.sh

backup: ## Dump the database to backups/
	./scripts/backup-db.sh

psql: ## Open a psql shell in the database container
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-tic} -d $${POSTGRES_DB:-tic}

# --- Local development (hot reload) ------------------------------------------
db: ## Start only postgres (for running backend/frontend locally)
	$(COMPOSE) up -d postgres

backend: ## Run the backend with Maven on :8080 (needs `make db`)
	cd backend && mvn spring-boot:run

frontend: ## Run the Vite dev server on :5173 (proxies /api to :8080)
	cd frontend && npm install && npm run dev

test: ## Compile/test backend and type-check + build frontend
	cd backend && mvn -B verify
	cd frontend && npm ci && npm run build

.PHONY: help up up-mail down ps logs deploy backup psql db backend frontend test
