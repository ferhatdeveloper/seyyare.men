#!/usr/bin/env bash
# Apply migrations → functions → policies in lexical order.
# Mounted as /docker-entrypoint-initdb.d/01_apply_schema.sh
set -euo pipefail

echo "[seyyare] applying migrations…"
for f in /docker-entrypoint-initdb.d/migrations/*.sql; do
  [ -f "$f" ] || continue
  base="$(basename "$f")"
  echo "  → $base"
  if [[ "$base" == "004_pgvector_recommendations.sql" ]]; then
    # Soft-launch images may lack pgvector; marketplace still boots.
    if ! psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"; then
      echo "  ⚠ skipped $base (pgvector unavailable)"
    fi
  else
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
  fi
done

echo "[seyyare] applying functions…"
for f in /docker-entrypoint-initdb.d/functions/*.sql; do
  [ -f "$f" ] || continue
  echo "  → $(basename "$f")"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
done

echo "[seyyare] applying policies…"
for f in /docker-entrypoint-initdb.d/policies/*.sql; do
  [ -f "$f" ] || continue
  echo "  → $(basename "$f")"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
done

echo "[seyyare] schema apply done"
