#!/usr/bin/env bash
# Soft-launch: bring up stack + ensure demo marketplace seed is loaded.
# Usage: ./scripts/go-live.sh [--reset-db]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RESET=0
if [[ "${1:-}" == "--reset-db" ]]; then
  RESET=1
fi

if [[ ! -f .env ]]; then
  echo "[go-live] creating .env from .env.example"
  cp .env.example .env
  # Soft-launch local defaults
  if command -v openssl >/dev/null 2>&1; then
    JWT="$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-64)"
    PGRST="$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-64)"
    # macOS sed
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" .env
      sed -i '' "s|^PGRST_JWT_SECRET=.*|PGRST_JWT_SECRET=${PGRST}|" .env
      sed -i '' "s|^NODE_ENV=.*|NODE_ENV=production|" .env
    else
      sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" .env
      sed -i "s|^PGRST_JWT_SECRET=.*|PGRST_JWT_SECRET=${PGRST}|" .env
      sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" .env
    fi
  fi
fi

# Avoid clashing with other local Postgres (e.g. omniflow on 5432)
if ! grep -q '^POSTGRES_PORT=' .env 2>/dev/null; then
  echo "POSTGRES_PORT=5433" >> .env
elif grep -q '^POSTGRES_PORT=5432$' .env; then
  if command -v lsof >/dev/null 2>&1 && lsof -iTCP:5432 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[go-live] host :5432 busy — using POSTGRES_PORT=5433"
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' 's/^POSTGRES_PORT=5432$/POSTGRES_PORT=5433/' .env
    else
      sed -i 's/^POSTGRES_PORT=5432$/POSTGRES_PORT=5433/' .env
    fi
  fi
fi

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env)

if [[ "$RESET" -eq 1 ]]; then
  echo "[go-live] RESET: wiping postgres volume"
  "${COMPOSE[@]}" down -v
fi

echo "[go-live] starting stack…"
"${COMPOSE[@]}" up -d --build postgres redis minio postgrest auth-service nginx

echo "[go-live] waiting for postgres…"
for i in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T postgres pg_isready -U "${POSTGRES_USER:-seyyare}" -d "${POSTGRES_DB:-seyyare}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# Existing volumes skip initdb — re-apply demo seed idempotently
echo "[go-live] applying reference + demo seed…"
"${COMPOSE[@]}" exec -T postgres psql -U "${POSTGRES_USER:-seyyare}" -d "${POSTGRES_DB:-seyyare}" \
  -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/02_seed_reference.sql || true
"${COMPOSE[@]}" exec -T postgres psql -U "${POSTGRES_USER:-seyyare}" -d "${POSTGRES_DB:-seyyare}" \
  -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/03_seed_demo.sql

echo "[go-live] counts:"
"${COMPOSE[@]}" exec -T postgres psql -U "${POSTGRES_USER:-seyyare}" -d "${POSTGRES_DB:-seyyare}" -c \
  "SELECT
     (SELECT count(*) FROM brands) AS brands,
     (SELECT count(*) FROM vehicles WHERE status='active') AS vehicles,
     (SELECT count(*) FROM rentals WHERE status='active') AS rentals,
     (SELECT count(*) FROM auctions WHERE status='live') AS auctions,
     (SELECT count(*) FROM users) AS users;"

echo ""
echo "[go-live] Soft-launch ready."
echo "  API:   http://localhost:${POSTGREST_PORT:-3000}"
echo "  Auth:  http://localhost:${AUTH_SERVICE_PORT:-5000}"
echo "  Demo:  demo@seyyare.men / Demo123!"
echo "  Also:  premium@seyyare.men · anadolu@seyyare.men · admin@seyyare.men"
echo ""
echo "  Mobile: EXPO_PUBLIC_USE_DEMO_FALLBACK=false (reads DB)"
echo "  Full stack: ${COMPOSE[*]} up -d"
