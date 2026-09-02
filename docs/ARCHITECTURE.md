# Seyyare.men — Mimari Dokümanı

## Genel Bakış

Seyyare.men, küresel AI-destekli araç ilan ve kiralama platformudur. 5 dilde (Türkçe, İngilizce, Arapça, Farsça, Kürtçe Badini/Sorani) çalışır, React Native (Expo) ile mobil öncelikli geliştirilmiştir.

## Servisler

```
┌─────────────────────────────────────────────────────────┐
│                  React Native (Expo)                     │
│  iOS + Android, 6 dil, AI vision/price/translate        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│            Nginx (Self-hosted, Let's Encrypt)            │
│  Reverse proxy + SSL termination                         │
└─┬───────────────┬───────────────┬───────────────────────┘
  │ /api/         │ /auth/        │ /ai/         /storage/
  ▼               ▼               ▼               ▼
┌────────┐  ┌────────┐      ┌────────┐      ┌────────┐
│PostgREST│  │Fastify │      │Fastify │      │ MinIO  │
│  v12   │  │  Auth  │      │   AI   │      │  S3    │
└───┬────┘  └────┬───┘      └────┬───┘      └────────┘
    │            │                │
    │            └────┬───────────┘
    ▼                 ▼
┌────────┐  ┌────────────┐  ┌────────────┐
│Postgres│  │   Redis    │  │ OpenRouter │
│  +GIS  │  │ Cache+RT   │  │   AI API   │
└────────┘  └────────────┘  └────────────┘
```

## Auth Flow

1. Mobil → POST /auth/register → auth-service bcrypt hash + users tablosuna insert
2. auth-service JWT (HS256) üretir (PostgREST-compatible payload)
3. Mobil access_token + refresh_token'ı expo-secure-store'a kaydeder
4. Her API isteğinde: Authorization: Bearer {access_token}
5. 401 alındığında: refresh mutex ile /auth/refresh, yeni token'lar
6. PostgREST JWT'yi doğrular → user_id ve role bilgisini alır
7. RLS politikaları user_id'ye göre sorgu sonuçlarını filtreler

## AI Akışı (Premium)

### Vision (Görselden araç tanıma)
```
Mobil multipart upload → ai-service /ai/recognize
  → Gemini 2.5 Flash (primary) → GPT-4o-mini (fallback)
  → JSON: { make, model, year, confidence, bodyType, color }
  → Redis cache (24 saat) + ai_jobs tablosuna log
  → ai_vehicle_analysis tablosuna persist
```

### Fiyat Tahmini
```
Mobil → ai-service /ai/price-suggest
  → DB'den son 90 gün aynı make/model/yıl ilanları (PostgreSQL aggregation)
  → İstatistik: median, mean, stddev
  → GPT-4o-mini: faktör analizi (premium marka, düşük km, hasarlı, vs.)
  → Final fiyat: median × (1 + adjustment_pct)
  → { suggestedPrice, rangeLow, rangeHigh, factors[], confidence }
```

### Çeviri
```
Mobil → ai-service /ai/translate { text, sourceLocale, targetLocales[] }
  → Llama 3.3 70B (free) paralel çağrılar
  → Redis cache (7 gün)
  → { translations: [{ targetLocale, text }] }
```

### Hasar Tespiti
```
Mobil 2-12 fotoğraf → ai-service /ai/damage-detect
  → Claude 3.5 Sonnet (vision + JSON output)
  → { damages: [{ part, severity, type, confidence, description }],
       overallScore (0-10),
       estimatedRepairCost: { min, max, currency },
       recommendation: "excellent|good|fair|poor" }
```

### Dinamik Kiralama Fiyatı
```
Mobil → GET /ai/rental-price?rentalId=X&startDate=Y&endDate=Z
  → Base rate × days
  → Faktörler:
    • Hafta sonu (Cuma-Cumartesi): +%15
    • Yaz sezonu (Haz-Ağu): +%10
    • Kış sezonu (Ara-Şub): -%5
    • Resmi tatil: +%20
    • Yüksek talep (>%70 doluluk): +%12
    • Düşük talep (<%20): -%10
    • Erken rezervasyon (>30 gün): -%8
    • Son dakika (<3 gün): +%8
    • Haftalık indirim (7+ gün): -%10
  → Toplam çarpan hesaplama
  → Final fiyat + breakdown
```

### AI Asistan (RAG)
```
Kullanıcı mesajı → ai-service /ai/assistant
  → PostgreSQL full-text search: ilgili ilanları çek
  → Claude 3.5 Sonnet: system prompt + context + user messages
  → Yanıt + suggestedFilters (PostgREST format) + matchedVehicles
```

## Veritabanı Şeması (Kritik Tablolar)

- **users**: kullanıcılar (auth, profil)
- **user_profiles**, **dealer_profiles**: ek bilgiler
- **vehicles**: ilanlar (marka, model, yıl, km, fiyat, konum, durum)
- **vehicle_media**: fotoğraf/video (S3 URL'leri)
- **ai_vehicle_analysis**: AI çıktıları (confidence, suggested_price, condition_score)
- **rentals**: kiralama ilanları (rate, min/max days, deposit)
- **bookings**: rezervasyonlar (tarih aralığı, durum, fiyat breakdown)
- **favorites**: favori ilanlar
- **conversations + messages**: mesajlaşma
- **content_translations**: içerik çevirileri (DB-backed i18n)
- **ai_jobs**: AI çağrı logları (cost tracking, debugging)

## 5-Dil Stratejisi

| Tip | Strateji |
|-----|----------|
| UI çevirileri | JSON namespace dosyaları (`apps/mobile/locales/{locale}/*.json`) |
| İçerik çevirisi (ilan başlık/açıklama) | DB'de `title_translations` JSONB + AI ile otomatik çeviri |
| Çoklu dilde arama | PostgreSQL `tsvector` (her dil için) + GIN index |
| RTL diller (ar, fa, ku-sor) | `I18nManager.forceRTL` + `isRTL()` helper |
| Yön-aware UI | `flex-row`/`flex-row-reverse` mantığı RTL'de otomatik |

## Self-Hosted Deployment

```bash
# Production VPS'e deploy
ssh user@seyyare.men
git clone https://github.com/ferhatdeveloper/seyyare.men.git
cd seyyare.men
./scripts/generate-secrets.sh > .env.production

# SSL sertifikaları
certbot certonly --nginx -d seyyare.men -d api.seyyare.men -d ai.seyyare.men

# Stack'i başlat
docker compose -f docker-compose.prod.yml up -d

# Monitoring
docker compose logs -f
```

## Maliyet Tahmini (10K MAU)

| Servis | Maliyet |
|--------|---------|
| VPS (Hetzner CCX23, 4 vCPU/16GB) | $40/ay |
| Domain + SSL (Let's Encrypt) | $12/yıl |
| OpenRouter (Gemini Flash + GPT-4o-mini ağırlıklı, cache aktif) | $50-150/ay |
| **Toplam** | **~$100-200/ay** |

## Güvenlik

- JWT HS256 + bcrypt (10 rounds)
- PostgREST RLS: tüm tablolarda user_id bazlı politikalar
- Rate limiting: Fastify @fastify/rate-limit (100 req/dk)
- expo-secure-store (Keychain / EncryptedSharedPreferences)
- SQL injection koruması: parameterized queries + PostgREST JSON API
- CORS: production'da whitelist, dev'de `*`
- CSP headers: Nginx'te
- Secrets: environment variables, .env asla commit edilmez