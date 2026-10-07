#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Pull the latest code and (re)deploy the stack on the server.
#   ./scripts/deploy.sh            # deploy current branch
#   ./scripts/deploy.sh --no-pull  # rebuild what is already checked out
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "ERROR: .env is missing. Run: cp .env.example .env  and fill in the secrets." >&2
  exit 1
fi

if [[ "${1:-}" != "--no-pull" ]]; then
  echo "==> Pulling latest code"
  git pull --ff-only
fi

echo "==> Backing up the database (if it is running)"
./scripts/backup-db.sh || echo "   (skipped - database not running yet)"

echo "==> Building images"
docker compose build --pull

echo "==> Starting containers"
docker compose up -d --remove-orphans

echo "==> Waiting for the backend to become healthy"
for _ in $(seq 1 60); do
  status=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q backend)" 2>/dev/null || echo starting)
  [[ "$status" == "healthy" ]] && break
  sleep 3
done
docker compose ps

if [[ "$status" != "healthy" ]]; then
  echo "WARNING: backend is '$status'. Check: docker compose logs --tail=200 backend" >&2
  exit 1
fi

echo "==> Cleaning up dangling images"
docker image prune -f >/dev/null

url=$(grep -E '^TIC_PORTAL_BASE_URL=' .env | cut -d= -f2-)
echo "==> Done. Open ${url:-http://<server-ip>}"
