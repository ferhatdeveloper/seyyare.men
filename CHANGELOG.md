# Changelog

Tüm önemli değişiklikler burada belgelenecek.

## [0.1.0] - 2026-09-02

### Faz 1: Temel Altyapı
- Monorepo (pnpm workspaces + Turborepo)
- Docker Compose stack (PostgreSQL 16 + PostGIS + PostgREST 12 + Redis 7 + MinIO + Nginx)
- Veritabanı şeması (35+ tablo, JWT auth fonksiyonları, RLS policies, search RPC)
- Custom JWT auth (Fastify: register/login/refresh/logout/me, bcrypt, refresh token rotation)
- AI service iskeleti (Fastify + OpenRouter client)
- Mobil: Expo SDK 52 + Expo Router + NativeWind + Zustand + TanStack Query
- 6 dilde tam çeviri: tr, en, ar, fa, ku-bad, ku-sor (RTL/LTR)
- Auth ekranları (login/register) + JWT refresh mutex
- GitHub Actions CI

### Faz 2: AI Temel
- OpenRouter client (auto-fallback, cost tracking, per-token pricing)
- POST /ai/recognize: görselden araç tanıma (Gemini 2.5 Flash + GPT-4o-mini fallback)
- POST /ai/price-suggest: 90 günlük piyasa analizi + LLM faktör analizi
- POST /ai/translate: tek metin çoklu dil çevirisi
- POST /ai/translate/batch: toplu çeviri
- POST /ai/generate-description: AI ilan açıklaması üretimi
- POST /ai/damage-detect: çoklu açı fotoğraftan hasar analizi
- POST /ai/assistant: RAG-destekli AI araç asistanı
- GET /ai/rental-price: dinamik kiralama fiyatı (talep, sezon, tatil, lead-time)
- POST /ai/fraud-check: dolandırıcılık tespiti (fiyat outlier, yeni satıcı, şüpheli keyword)
- GET /ai/admin/analytics: admin dashboard istatistikleri
- Mobil: ImageUploader, PricePredictor, AI asistan ekranı
- Sell ekranı AI entegrasyonu

### Faz 3: Sosyal & Keşif
- VehicleCard component (favori toggle, kapak fotoğrafı, fiyat, konum)
- FilterSheet (marka, kasa, yakıt, vites, durum, ülke, fiyat/yıl aralığı)
- Search ekranı (PostgREST RPC + infinite scroll-ready)
- Vehicle detay ekranı (galeri, swipe, AI analiz badge)
- Chat ekranı (refetch interval 5s)
- Favoriler ekranı
- Ana sayfa: son ilanlar + marka grid + AI asistan CTA

### Faz 4: Kiralama
- Rentals list screen
- Rental detail screen (galeri, dinamik fiyat breakdown, tarih seçici)
- AI service /ai/rental-price entegrasyonu
- Book butonu (auth kontrolü + rezervasyon oluşturma)
- Deposit, age requirement, sigorta badge'leri

### Faz 5: İleri AI
- Fraud detection (fiyat outlier analizi, yeni satıcı kontrolü, şüpheli keyword)
- Admin analytics dashboard (piyasa istatistikleri, AI kullanım trend)
- Hasar tespiti (Claude 3.5 Sonnet)
- AI asistan (RAG destekli)

### Faz 6: Polish & Deploy
- EAS Build workflow (Android + iOS)
- Production deployment rehberi
- API dokümanı
- Mimari dokümanı
- README güncellendi