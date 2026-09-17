# Seyyare Web (marketing)

Public marketplace landing for soft-live / production gateway.

## Dev

```bash
cd apps/web
pnpm install   # or npm install
pnpm dev       # http://localhost:5173 (proxies /api → :8088)
```

## Docker

Built as `seyyare-web` and proxied from gateway nginx at `/`.

```bash
docker compose -f docker-compose.yml -f docker-compose.soft.yml --env-file .env up -d --build web nginx
```

Tunnel URL root serves this site; `/api` remains PostgREST.
