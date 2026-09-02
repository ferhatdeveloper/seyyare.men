#!/usr/bin/env bash
set -euo pipefail

# Development ortamı kurulum scripti
# Tüm servisleri başlatır ve ilk migration'ları çalıştırır

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🔧 Seyyare.men development kurulumu başlatılıyor..."

# 1. .env dosyası yoksa oluştur
if [[ ! -f .env ]]; then
  echo "📝 .env dosyası oluşturuluyor..."
  cp .env.example .env
  echo "⚠️  Lütfen .env içindeki secret'ları güncelleyin (özellikle OPENROUTER_API_KEY)"
fi

# 2. Docker compose servislerini başlat
echo "🐳 Docker servisleri başlatılıyor..."
docker compose up -d postgres redis minio postgrest

# 3. Veritabanı hazır mı?
echo "⏳ PostgreSQL hazır olması bekleniyor..."
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U seyyare -d seyyare > /dev/null 2>&1; then
    echo "✅ PostgreSQL hazır"
    break
  fi
  sleep 1
done

# 4. Auth & AI servisleri başlat
echo "🚀 Auth & AI servisleri başlatılıyor..."
docker compose up -d auth-service ai-service

# 5. pgAdmin (opsiyonel)
echo "📊 pgAdmin başlatılıyor..."
docker compose up -d pgadmin

echo ""
echo "✅ Kurulum tamamlandı!"
echo ""
echo "📍 Erişim noktaları:"
echo "   - PostgREST API:    http://localhost:3000"
echo "   - Auth Service:     http://localhost:5000"
echo "   - AI Service:       http://localhost:4000"
echo "   - MinIO Console:    http://localhost:9001"
echo "   - pgAdmin:          http://localhost:5050"
echo ""
echo "📱 Mobil uygulamayı başlatmak için:"
echo "   cd apps/mobile && pnpm start"