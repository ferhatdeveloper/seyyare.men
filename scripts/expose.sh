#!/usr/bin/env bash
# Soft-launch stack + Cloudflare quick tunnel (bu PC'den dışa aç)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.soft.yml --env-file .env)

# Soft ports (avoid host conflicts)
if [[ "$(uname)" == "Darwin" ]]; then
  grep -q '^HTTP_PORT=' .env && sed -i '' 's/^HTTP_PORT=.*/HTTP_PORT=8088/' .env || echo 'HTTP_PORT=8088' >> .env
  grep -q '^HTTPS_PORT=' .env && sed -i '' 's/^HTTPS_PORT=.*/HTTPS_PORT=8443/' .env || echo 'HTTPS_PORT=8443' >> .env
  grep -q '^MINIO_PORT=' .env && sed -i '' 's/^MINIO_PORT=.*/MINIO_PORT=9002/' .env || echo 'MINIO_PORT=9002' >> .env
  grep -q '^MINIO_CONSOLE_PORT=' .env && sed -i '' 's/^MINIO_CONSOLE_PORT=.*/MINIO_CONSOLE_PORT=9003/' .env || echo 'MINIO_CONSOLE_PORT=9003' >> .env
else
  grep -q '^HTTP_PORT=' .env && sed -i 's/^HTTP_PORT=.*/HTTP_PORT=8088/' .env || echo 'HTTP_PORT=8088' >> .env
  grep -q '^HTTPS_PORT=' .env && sed -i 's/^HTTPS_PORT=.*/HTTPS_PORT=8443/' .env || echo 'HTTPS_PORT=8443' >> .env
  grep -q '^MINIO_PORT=' .env && sed -i 's/^MINIO_PORT=.*/MINIO_PORT=9002/' .env || echo 'MINIO_PORT=9002' >> .env
  grep -q '^MINIO_CONSOLE_PORT=' .env && sed -i 's/^MINIO_CONSOLE_PORT=.*/MINIO_CONSOLE_PORT=9003/' .env || echo 'MINIO_CONSOLE_PORT=9003' >> .env
fi

echo "[expose] starting full stack…"
# Orchestrator uses tsx (no tsc gate). Build may take a few minutes.
"${COMPOSE[@]}" up -d --build postgres redis postgrest minio auth-service ai-service orchestrator nginx || {
  echo "[expose] full up failed — retrying core + nginx without orchestrator"
  "${COMPOSE[@]}" up -d --build postgres redis postgrest minio auth-service ai-service nginx
}

echo "[expose] waiting for nginx…"
for i in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:8088/healthz" >/dev/null 2>&1; then
    echo "[expose] nginx ok"
    break
  fi
  sleep 2
done

mkdir -p .run
LOG=".run/cloudflared.log"
PIDF=".run/cloudflared.pid"
URLF=".run/public-url.txt"

if [[ -f "$PIDF" ]] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then
  echo "[expose] cloudflared already running (pid $(cat "$PIDF"))"
else
  echo "[expose] starting Cloudflare quick tunnel → localhost:8088"
  : > "$LOG"
  nohup cloudflared tunnel --url "http://127.0.0.1:8088" --no-autoupdate >"$LOG" 2>&1 &
  echo $! > "$PIDF"
fi

PUBLIC=""
for i in $(seq 1 40); do
  PUBLIC=$(rg -o 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)
  if [[ -n "$PUBLIC" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$PUBLIC" ]]; then
  echo "[expose] tunnel URL not ready yet — check $LOG"
  tail -20 "$LOG" || true
  exit 1
fi

echo "$PUBLIC" > "$URLF"

# Persist public base into .env for Expo
set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" .env; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^${key}=.*|${key}=${val}|" .env
    else
      sed -i "s|^${key}=.*|${key}=${val}|" .env
    fi
  else
    echo "${key}=${val}" >> .env
  fi
}

set_env EXPO_PUBLIC_API_URL "${PUBLIC}/api"
set_env EXPO_PUBLIC_AUTH_URL "${PUBLIC}/auth"
set_env EXPO_PUBLIC_AI_URL "${PUBLIC}/ai"
set_env EXPO_PUBLIC_ORCHESTRATOR_URL "${PUBLIC}/orch"
set_env EXPO_PUBLIC_MINIO_URL "${PUBLIC}/storage"
set_env EXPO_PUBLIC_USE_DEMO_FALLBACK false
set_env EXPO_PUBLIC_PUBLIC_BASE "$PUBLIC"

# Also write apps/mobile/.env for Expo
cat > apps/mobile/.env <<EOF
EXPO_PUBLIC_API_URL=${PUBLIC}/api
EXPO_PUBLIC_AUTH_URL=${PUBLIC}/auth
EXPO_PUBLIC_AI_URL=${PUBLIC}/ai
EXPO_PUBLIC_ORCHESTRATOR_URL=${PUBLIC}/orch
EXPO_PUBLIC_MINIO_URL=${PUBLIC}/storage
EXPO_PUBLIC_USE_DEMO_FALLBACK=false
EOF

echo ""
echo "============================================"
echo "  Seyyare dışa açık (Cloudflare Tunnel)"
echo "  Public: $PUBLIC"
echo "  Health: $PUBLIC/healthz"
echo "  API:    $PUBLIC/api/vehicles?status=eq.active&limit=1"
echo "  Auth:   $PUBLIC/auth/"
echo "  Demo:   demo@seyyare.men / Demo123!"
echo "============================================"
echo "Expo: apps/mobile/.env güncellendi — metro'yu yeniden başlat."
curl -sf "$PUBLIC/healthz" && echo "" || echo "(tunnel health henüz ısınabilir)"
