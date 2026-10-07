#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Dump the PostgreSQL database to backups/tic-YYYYmmdd-HHMMSS.sql.gz
# Keeps the 14 most recent dumps.
# Restore:  gunzip -c backups/<file>.sql.gz | docker compose exec -T postgres psql -U tic -d tic
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
mkdir -p backups
file="backups/tic-$(date +%Y%m%d-%H%M%S).sql.gz"

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-tic}" -d "${POSTGRES_DB:-tic}" --clean --if-exists | gzip > "$file"
echo "   saved $file"

ls -1t backups/tic-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --
