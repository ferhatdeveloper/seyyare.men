#!/usr/bin/env bash
set -euo pipefail

# Production secrets üretici
# Kullanım: ./scripts/generate-secrets.sh > .env.production

echo "# Seyyare.men — Production secrets"
echo "# Generated on $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-40)"
echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-64)"
echo "PGRST_JWT_SECRET=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-64)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-40)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-32)"