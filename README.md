# Seyyare.men — Küresel AI-Destekli Araç Platformu

Seyyare.men, 5 dilde (Kürtçe Badini/Sorani, Arapça, Türkçe, İngilizce, Farsça) çalışan, AI destekli, mobil öncelikli, araç satış + kiralama platformudur.

## Özellikler

- AI destekli görsel araç tanıma (marka, model, yıl)
- AI fiyat tahmini ve açıklanabilir fiyat breakdown
- AI hasar tespiti (çoklu açı fotoğraftan)
- Otomatik çoklu dil çevirisi (OpenRouter)
- AI asistan (doğal dilde araç arama)
- Dinamik kiralama fiyatlandırması
- Konum tabanlı arama (PostGIS)
- Gerçek zamanlı mesajlaşma
- Favoriler, kaydedilmiş aramalar, fiyat alarmları
- Dealer/Showroom profilleri + puanlama

## Mimari

```
React Native (Expo) ─► Nginx ─► PostgREST  ─► PostgreSQL 16 + PostGIS
                              ├► AI Service ─► OpenRouter
                              ├► Auth Service (Fastify JWT)
                              ├► Redis (cache + realtime)
                              └► MinIO (görsel/video)
```

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Mobil | React Native + Expo SDK 52 |
| API | PostgREST 12 + Fastify (auth/AI) |
| DB | PostgreSQL 16 + PostGIS + pg_trgm |
| Cache | Redis 7 |
| Storage | MinIO (S3-API) |
| AI | OpenRouter (500+ model) |
| Container | Docker Compose |

## Hızlı Başlangıç

### Önkoşullar
- Docker + Docker Compose
- Node.js 22+
- pnpm 9+
- Expo CLI (`npm i -g expo-cli`)
- iOS Simulator veya Android Emulator (mobil geliştirme için)

### Kurulum

```bash
# 1. Repo'yu klonla
git clone https://github.com/ferhatdeveloper/seyyare.men.git
cd seyyare.men

# 2. Environment dosyasını kopyala
cp .env.example .env
# .env içindeki secretları düzenle (özellikle JWT_SECRET, POSTGRES_PASSWORD, OPENROUTER_API_KEY)

# 3. Backend servislerini başlat
docker compose up -d

# 4. Veritabanı migration'larını çalıştır
docker compose exec postgrest psql -U seyyare -d seyyare -f /docker-entrypoint-initdb.d/migrations/001_initial_schema.sql

# 5. Bağımlılıkları kur
pnpm install

# 6. Mobil uygulamayı başlat
cd apps/mobile
pnpm start
```

Expo Go ile QR kodu tarayın ve uygulama açılacaktır.

## Diller

- `tr` — Türkçe (varsayılan)
- `en` — İngilizce
- `ar` — Arapça (RTL)
- `fa` — Farsça (RTL)
- `ku-bad` — Kürtçe Badini (LTR)
- `ku-sor` — Kürtçe Sorani (RTL)

## Yol Haritası

- [x] Faz 1 — Temel altyapı (monorepo, Docker, DB, auth, Expo bootstrap)
- [ ] Faz 2 — AI temel (OpenRouter, vision, price, translate)
- [ ] Faz 3 — Sosyal & keşif (favoriler, arama, mesajlaşma)
- [ ] Faz 4 — Kiralama modülü
- [ ] Faz 5 — İleri AI (hasar, asistan, analitik)
- [ ] Faz 6 — Polish, store yayını, beta

## Lisans

MIT — bkz. [LICENSE](./LICENSE)