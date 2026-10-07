# CLAUDE.md: TIC Platform

Context for Claude Code. Read README.md for the full layout and deployment guide.

## What this is
A monorepo with three parts:
- `frontend/`: React 19 + Vite + Tailwind. One app containing the public landing page (`/`) and the role-based portal.
- `backend/`: Spring Boot 3.3, Java 21.
- PostgreSQL 16, with the schema managed by Flyway.

Everything runs with `docker compose`. Nginx in the frontend container proxies `/api` to the backend.

## Commands
- Full stack: `docker compose --profile mail up -d --build` (needs `.env`: `cp .env.example .env`)
- Deploy on the server: `./scripts/deploy.sh`
- Local dev: `make db`, `make backend` (port 8080), `make frontend` (port 5173)
- Backend build/test: `cd backend && mvn -B verify`
- Frontend type-check and build: `cd frontend && npm run build`
- Logs: `docker compose logs -f backend`

## Backend conventions (follow these when adding features)
- Layer-first packages under `com.tic`: `config`, `security`, `controller`, `service`, `repository`, `model` (+`model/enums`), `dto/request`, `dto/response`, `exception`, `shared`, `seed`.
- Flow: controller → service → repository. Controllers only validate, call one service method and wrap the result in `ApiResponse.ok(...)`.
- **No Lombok and no MapStruct.** DTOs are Java records. Response DTOs map themselves with a static `from(entity, ...)` factory.
- Entities live in `model/` and extend `shared/model/BaseEntity` (UUID id). Use enums in `model/enums` for fixed values.
- Data access: Spring Data JPA interfaces for entity tables. `JdbcTemplate` repositories (`ClientRepository`, `InspectionRequestRepository`, `InspectionBoardRepository`, `UserRoleRepository`, `AccountSetupTokenRepository`) handle tables without entities. Keep SQL in repositories, never in services.
- Errors: throw the subclasses in `exception/` (`BadRequestException`, `ForbiddenException`, `NotFoundException`, `ConflictException`, `UnauthorizedException`, `ExternalServiceException`) with an UPPER_SNAKE code. `GlobalExceptionHandler` formats them.
- Auth: a JWT carries `CurrentUser`. Add a `CurrentUser` parameter to a controller method to receive it. Use `@PreAuthorize` for coarse role checks and `CurrentUser.isSystemAdmin()/isAdministrator()/isOrganizationOperator()/isInspector()/isClient()` for rules inside services.
- Multi-tenancy: `TenantContext.requireTenantId()`. Always filter queries by `tenant_id`.
- Schema changes go in a new Flyway file `backend/src/main/resources/db/migration/V<next>__name.sql`. Never edit applied migrations. `ddl-auto` is `validate`.
- Settings: add new ones to `config/TicProperties`, `application.yml`, `.env.example` and the backend environment in `docker-compose.yml`.

## Frontend conventions
- Feature folders in `src/modules/<feature>/{api,components,pages}`. Shared code lives in `src/shared`.
- The API client is `src/shared/lib/apiClient.ts` with base URL `/api/v1`, and it sends the `X-Tenant-Slug: agricert-kenya` header.
- Routes are defined in `src/app/router.tsx`.

## Domain vocabulary
- "Client" in the UI equals role code `FARMER`, table `farmers`. "Site" equals table `farms`.
- Request lifecycle: PENDING_REVIEW → PENDING_ASSIGNMENT → ASSIGNED → IN_PROGRESS → SUBMITTED → COMPLETED or REJECTED.

## Never
- Commit `.env` or any credentials.
- Use Lombok or MapStruct.
- Expose Postgres beyond 127.0.0.1.
