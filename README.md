# TIC Platform

Training, Inspection & Certification operations for Kenyan agriculture: a public landing page, a role-based operations portal (admins, supervisors, inspectors, clients) and a Spring Boot API.

| Part | Stack |
|---|---|
| `frontend/` | React 19, TypeScript, Vite, Tailwind, React Query. Served by Nginx in Docker |
| `backend/` | Spring Boot 3.3, Java 21, Spring Security + JWT, JPA/JDBC, Flyway |
| database | PostgreSQL 16 |

```
Browser ──► frontend (Nginx :80) ──/api──► backend (:8080) ──► postgres (:5432)
```

Only port 80 is published. Nginx serves the React app and proxies `/api` to the backend, so the browser and the API share one origin and CORS isn't needed.

---

## Repository layout

```
tic-platform/
├── docker-compose.yml        # postgres + backend + frontend (+ optional mailpit)
├── .env.example              # every setting, copy to .env
├── Makefile                  # `make help` lists shortcuts
├── scripts/
│   ├── server-setup.sh       # one-time: install Docker + firewall on Ubuntu
│   ├── deploy.sh             # git pull → backup → build → restart → health check
│   └── backup-db.sh          # pg_dump to backups/
├── docs/
├── frontend/
│   ├── Dockerfile  nginx.conf
│   └── src/
│       ├── app/              # App, router, providers (auth, tenant, react-query)
│       ├── modules/          # one folder per feature: landing, auth, users, organizations,
│       │                     #   inspections, dashboard, reports, ...  (api/ components/ pages/)
│       └── shared/           # apiClient, hooks, ui primitives, types
└── backend/
    ├── Dockerfile  pom.xml
    └── src/main/
        ├── resources/
        │   ├── application.yml
        │   └── db/migration/ # Flyway V1..V11 (the schema lives here)
        └── java/com/tic/
            ├── TicApplication.java
            ├── config/       # SecurityConfig, WebConfig, TicProperties (all tic.* settings)
            ├── security/     # JwtService, JWT + licence filters, CurrentUser
            ├── controller/   # REST endpoints only: validate input → call service → wrap response
            ├── service/      # business rules and permission checks
            ├── repository/   # data access: Spring Data JPA interfaces + JdbcTemplate SQL
            ├── model/        # JPA entities (DB tables) + model/enums
            ├── dto/
            │   ├── request/  # what the API accepts
            │   └── response/ # what the API returns; each maps itself with a static from(...)
            ├── exception/    # TicException + BadRequest/Forbidden/NotFound/... + GlobalExceptionHandler
            ├── shared/       # BaseEntity, ApiResponse/ErrorResponse, tenancy, RoleCodes, utils
            └── seed/         # start-up data: reference data, first admin, optional demo users
```

### Backend conventions
- **Flow:** `controller → service → repository → model`. Controllers hold no logic; services never return entities (they return `dto.response` records).
- **Mapping:** no MapStruct and no Lombok. A response record maps itself, e.g. `UserResponse.from(user, roles)`, using its constructor.
- **Errors:** throw `BadRequestException`, `ForbiddenException`, `NotFoundException`, `ConflictException`, etc. with a stable `CODE`. Every error comes back as `{ "error": { code, message, fieldErrors, traceId } }`.
- **Success envelope:** `{ "data": ..., "meta": ... }` through `ApiResponse.ok(...)`.
- **Schema changes:** add a new `V12__description.sql` migration and never edit an applied one. Hibernate only *validates* the schema.
- **Roles:** `SYSTEM_ADMIN` (platform owner), `ORG_ADMIN`, `SUPERVISOR`, `INSPECTOR`, `FARMER` (shown as "Client" in the UI). See `shared/constants/RoleCodes`.

---

## Run everything locally with Docker

```bash
cp .env.example .env              # defaults work locally; change passwords for servers
docker compose --profile mail up -d --build
```

- App: <http://localhost>
- Test inbox (invitation and reset emails): <http://localhost:8025>
- Log in with `TIC_ADMIN_EMAIL` / `TIC_ADMIN_PASSWORD` from `.env`

To get demo accounts, set `TIC_SEED_DEMO_USERS=true` in `.env`. That creates `supervisor@`, `inspector@` and `farmer@agricert.co.ke`, all with password `Dev@12345`.

## Develop with hot reload

```bash
cp .env.example .env
make db          # postgres only, on 127.0.0.1:5432
make backend     # mvn spring-boot:run on :8080 (reads ../.env automatically)
make frontend    # vite on http://localhost:5173 (proxies /api → :8080)
```

Requirements: Java 21, Maven 3.9+, Node 22, Docker.

---

## Deploy to a server (HTTP on the server IP)

Tested target: Ubuntu 22.04/24.04 with at least 2 GB RAM. Building the backend image needs about 1.5 GB.

**1. Prepare the server (once):**
```bash
ssh user@SERVER_IP
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/<you>/tic-platform.git
cd tic-platform
sudo ./scripts/server-setup.sh     # installs Docker + compose, opens ports 22 and 80
exit                               # log out/in so `docker` works without sudo
```

**2. Configure:**
```bash
cd tic-platform
cp .env.example .env
nano .env
```
Set at least:
| Variable | Value |
|---|---|
| `TIC_PORTAL_BASE_URL` | `http://SERVER_IP` |
| `POSTGRES_PASSWORD` | output of `openssl rand -base64 32` |
| `TIC_JWT_SECRET` | output of `openssl rand -base64 48` |
| `TIC_ADMIN_EMAIL` / `TIC_ADMIN_PASSWORD` | your first administrator |
| `MAIL_*` | Gmail app password or other SMTP, or keep Mailpit for testing |

**3. Start:**
```bash
./scripts/deploy.sh --no-pull
```
Open `http://SERVER_IP`.

**Updating later** (after you push to git):
```bash
cd tic-platform && ./scripts/deploy.sh      # pull → backup DB → rebuild → restart → health check
```

**Useful commands**
```bash
docker compose ps                            # status / health
docker compose logs -f backend               # backend logs
make backup                                  # DB dump to backups/
gunzip -c backups/<file>.sql.gz | docker compose exec -T postgres psql -U tic -d tic   # restore
```

> **HTTPS later:** point a domain at the server and put Caddy or Certbot in front of port 80, then set `TIC_PORTAL_BASE_URL=https://your-domain`.

---

## Environment variables

All of them are documented in [`.env.example`](.env.example). The backend reads them through `backend/src/main/resources/application.yml` into `config/TicProperties`.

## API overview

| Area | Base path |
|---|---|
| Auth (login, client sign-up, forgot password, account set-up links) | `/api/v1/auth/**` (public) |
| Organizations for the sign-up form | `/api/v1/public/organizations` (public) |
| Users | `/api/v1/users` |
| Organizations and licences | `/api/v1/organizations` |
| Inspection workflow | `/api/v1/inspection-workflow` |
| Health | `/actuator/health` |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Set POSTGRES_PASSWORD in .env` on `docker compose up` | You haven't created `.env` yet: `cp .env.example .env` |
| Inviting a user returns *email could not be sent* | Start Mailpit (`docker compose --profile mail up -d`) or configure real SMTP in `.env` |
| Frontend loads but login fails | `docker compose logs backend`. Usually a database password mismatch after changing `.env` on an existing volume |
| Changed `POSTGRES_PASSWORD` after the first start | The volume keeps the old password. Change it inside Postgres, or `docker compose down -v` (**deletes data**) |
