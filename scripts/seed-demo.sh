#!/usr/bin/env bash
# Re-apply reference + demo seed on a running postgres container.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose --env-file .env)
if [[ -f docker-compose.prod.yml ]]; then
  COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env)
fi

"${COMPOSE[@]}" exec -T postgres psql -U "${POSTGRES_USER:-seyyare}" -d "${POSTGRES_DB:-seyyare}" \
  -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/02_seed_reference.sql
"${COMPOSE[@]}" exec -T postgres psql -U "${POSTGRES_USER:-seyyare}" -d "${POSTGRES_DB:-seyyare}" \
  -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/03_seed_demo.sql

# Full brand/model catalog (host path — may not be in initdb mount yet)
if [[ -f infra/postgres/seed_demo_catalog.sql ]]; then
  "${COMPOSE[@]}" exec -T postgres psql -U "${POSTGRES_USER:-seyyare}" -d "${POSTGRES_DB:-seyyare}" \
    -v ON_ERROR_STOP=1 < infra/postgres/seed_demo_catalog.sql
fi

"${COMPOSE[@]}" exec -T postgres psql -U "${POSTGRES_USER:-seyyare}" -d "${POSTGRES_DB:-seyyare}" -c \
  "SELECT count(*) AS active_vehicles FROM vehicles WHERE status='active';
   SELECT b.name->>'en' AS brand, count(v.*) AS n
   FROM brands b LEFT JOIN vehicles v ON v.make_id=b.id AND v.status='active'
   GROUP BY 1 ORDER BY 1;"
echo "Demo login: demo@seyyare.men / Demo123!"
