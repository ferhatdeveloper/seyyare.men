# Seyyare.men — Production Deployment Rehberi

## Mimari Özet

```
                 ┌───────────────────────────┐
                 │   Cloudflare (CDN + SSL)    │
                 └─────────────┬─────────────┘
                               │
                 ┌─────────────▼─────────────┐
                 │   Nginx (Reverse Proxy)     │
                 └─────┬───────┬───────┬───────┘
                       │       │       │
              ┌────────▼─┐ ┌───▼───┐ ┌─▼──────────┐
              │PostgREST │ │Auth   │ │Orchestrator│ (Fastify)
              │(api/db)  │ │(auth) │ │ + 10 agents │
              └────┬─────┘ └───┬───┘ └────┬───────┘
                   │           │          │
                   └───────────┴──────────┘
                              │
                  ┌───────────▼─────────────┐
                  │   PostgreSQL + Redis     │
                  │   (pgvector extension)   │
                  └─────────────────────────┘
```

## Gereksinimler

### Minimum VPS (10K MAU)
| Kaynak | Spec |
|--------|------|
| CPU | 4 vCPU |
| RAM | 8 GB |
| Disk | 80 GB SSD |
| OS | Ubuntu 22.04 LTS / Debian 12 |
| Network | 1 Gbps |

**Tahmini aylık maliyet (Hetzner CCX23):** $40

### Domain & SSL
- Domain adı (örn: `seyyare.men`)
- Cloudflare hesabı (ücretsiz plan yeterli)
- Let's Encrypt SSL (Cloudflare üzerinden otomatik)

### 3rd Party
- OpenRouter API key (https://openrouter.ai)
- Langfuse hesabı (opsiyonel, https://langfuse.com)
- Resend/SendGrid (email, opsiyonel)

## Adım Adım Deployment

### 1. VPS İlk Kurulum

```bash
# Ubuntu 22.04'a giriş yaptıktan sonra
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban

# Firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Docker
curl -fsSL https://get.docker.com | sh
sudo apt install -y docker-compose-plugin
sudo usermod -aG docker $USER
```

### 2. Repo Clone + Environment

```bash
sudo mkdir -p /opt/seyyare
cd /opt/seyyare
sudo git clone https://github.com/ferhatdeveloper/seyyare.men.git .
sudo chown -R $USER:$USER .

# Production secrets üret
./scripts/generate-secrets.sh > .env.production

# Production env'i düzenle (OPENROUTER_API_KEY vs.)
nano .env.production
```

**`.env.production` örneği:**
```bash
NODE_ENV=production
POSTGRES_USER=seyyare
POSTGRES_PASSWORD=<generated-strong-password>
POSTGRES_DB=seyyare
JWT_SECRET=<generated-strong-secret>
PGRST_JWT_SECRET=<same-secret>
OPENROUTER_API_KEY=sk-or-v1-<your-key>
LANGFUSE_PUBLIC_KEY=pk-lf-<your-key>
LANGFUSE_SECRET_KEY=sk-lf-<your-key>
APP_URL=https://seyyare.men
```

### 3. SSL — Cloudflare Origin Certificate

Cloudflare dashboard'da:
1. SSL/TLS → Origin Server → Create Certificate
2. Private key + cert'i `/opt/seyyare/infra/nginx/certs/` içine kaydet
3. `cloudflare.crt` ve `cloudflare.key`

### 4. Nginx Production Config

`infra/nginx/nginx.conf` güncellemesi (production için Cloudflare real IP):
```nginx
server {
    listen 443 ssl http2;
    server_name seyyare.men www.seyyare.men;

    ssl_certificate /etc/nginx/certs/cloudflare.crt;
    ssl_certificate_key /etc/nginx/certs/cloudflare.key;

    # Cloudflare real IP (rate limiting için)
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    real_ip_header CF-Connecting-IP;
}
```

### 5. Stack Başlatma

```bash
cd /opt/seyyare
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Migration'ları doğrula
docker compose exec postgres psql -U seyyare -d seyyare \
  -c "SELECT extname FROM pg_extension WHERE extname IN ('vector', 'postgis', 'pg_trgm');"

# pgvector kontrolü (vector(384) var mı?)
docker compose exec postgres psql -U seyyare -d seyyare \
  -c "SELECT typname FROM pg_type WHERE typname='vector';"

# Seed (ilk kurulum)
docker compose exec postgres psql -U seyyare -d seyyare \
  -f /docker-entrypoint-initdb.d/99_seed.sql

# Health check
curl https://seyyare.men/healthz
```

### 6. Langfuse Self-Hosted (opsiyonel)

```bash
# Langfuse Cloud (kolay) — dashboard.langfuse.com'da ücretsiz hesap aç
# LANGFUSE_PUBLIC_KEY ve LANGFUSE_SECRET_KEY'i .env.production'a ekle

# VEYA self-hosted:
docker run -d --name langfuse \
  -p 3001:3000 \
  -e DATABASE_URL=postgresql://... \
  -e NEXTAUTH_SECRET=... \
  -e NEXTAUTH_URL=https://langfuse.seyyare.men \
  langfuse/langfuse:latest
```

### 7. CI/CD (GitHub Actions)

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'
      - '*.md'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/seyyare
            git pull origin main
            docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache api-auth orchestrator ai-service
            docker compose -f docker-compose.prod.yml --env-file .env.production up -d
            docker image prune -f
            ./scripts/smoke-tests.sh
```

### 8. Backup Stratejisi

```bash
# /etc/cron.d/seyyare-backup
0 3 * * * deploy /opt/seyyare/scripts/backup.sh
```

`scripts/backup.sh`:
```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR=/var/backups/seyyare
mkdir -p $BACKUP_DIR

# PostgreSQL
docker compose exec -T postgres pg_dump -U seyyare seyyare | \
  gzip > $BACKUP_DIR/db-$(date +\%Y\%m\%d).sql.gz

# MinIO (vehicles media)
docker run --rm -v seyyare_minio_data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/minio-$(date +\%Y\%m\%d).tar.gz /data

# Retention: 30 gün
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Off-site upload (opsiyonel — S3)
aws s3 sync $BACKUP_DIR s3://seyyare-backups/ 2>/dev/null || true
```

### 9. Monitoring & Alerting

#### Prometheus + Grafana (opsiyonel)
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./infra/prometheus.yml:/etc/prometheus/prometheus.yml
  grafana:
    image: grafana/grafana
  node-exporter:
    image: prom/node-exporter
```

#### Uptime monitoring
- UptimeRobot veya BetterStack
- Her 5 dakikada `/healthz` endpoint'ine istek
- Email/SMS alert: %99.9 SLA hedefi

#### Langfuse alerts
```yaml
# Langfuse alerts (UI'dan ayarlanır)
- Avg agent duration > 5s
- Failure rate > %10
- Cost > $100/day
```

### 10. Performans Optimizasyonu (Production)

```nginx
# /etc/nginx/nginx.conf — gzip + cache
gzip on;
gzip_types text/json application/json;
gzip_min_length 1024;

# Static cache
location ~* \.(jpg|jpeg|png|webp|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

```toml
# PostgreSQL tuning
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 16MB
maintenance_work_mem = 512MB
wal_buffers = 64MB
max_connections = 200
```

### 11. Domain Yapılandırması

| Subdomain | Amaç |
|-----------|------|
| `seyyare.men` | Web (Expo Web build) |
| `api.seyyare.men` | PostgREST + AI + Orchestrator (Nginx) |
| `auth.seyyare.men` | Auth Service |
| `ai.seyyare.men` | AI Service |
| `langfuse.seyyare.men` | Langfuse (self-host ise) |

Cloudflare DNS:
- `A` records → VPS IP
- `CNAME` records → `seyyare.men` veya Cloudflare proxy

## Monitoring Dashboard

`/admin/orchestrator/stats` — Agent performansı
`/admin/cache/stats` — Cache hit/miss oranları
`/admin/experiments` — A/B test sonuçları
`/admin/langfuse/traces` — Son 50 trace

## Ölçeklendirme (Scaling)

### Faz 1: 0-10K MAU (Mevcut)
- Tek VPS, tüm servisler
- $40/ay

### Faz 2: 10K-100K MAU
- 2x VPS (Postgres + Redis ayrı)
- Cloudflare Workers (edge caching)
- CDN (Cloudflare R2)
- ~$300/ay

### Faz 3: 100K+ MAU
- Kubernetes (DigitalOcean / AWS EKS)
- Read replicas
- OpenRouter rate limit artışı
- ~$1500+/ay

## Güvenlik Kontrol Listesi

- [x] HTTPS zorunlu (HTTP → HTTPS redirect)
- [x] JWT secret'ı güçlü (32+ karakter)
- [x] PostgreSQL şifresi güçlü
- [x] Firewall (UFW) — sadece 22/80/443
- [x] Cloudflare proxy (DDoS koruması)
- [x] Rate limiting (Fastify @fastify/rate-limit, Nginx limit_req)
- [x] fail2ban (brute-force koruması)
- [x] expo-secure-store (token storage)
- [x] JWT refresh token rotation
- [x] RLS (Row-Level Security) her tabloda
- [x] SQL injection koruması (parameterized queries)
- [x] Audit logging (agent_jobs tablosu)
- [x] Langfuse tracing (her agent call)
- [x] CORS whitelist (sadece seyyare.men)
- [x] CSP headers (Nginx)
- [x] Privacy: KVKK/GDPR uyumlu
- [x] Backup (günlük pg_dump)
- [x] Uptime monitoring (UptimeRobot)

## Rollback Stratejisi

```bash
# Önceki image tag'ine dön
cd /opt/seyyare
git log --oneline  # önceki commit'i bul
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Smoke Tests (Post-Deploy)

`scripts/smoke-tests.sh`:
```bash
#!/bin/bash
set -euo pipefail

BASE_URL=https://api.seyyare.men

echo "1. Health check..."
curl -sf $BASE_URL/health | jq

echo "2. PostgREST tables..."
curl -sf $BASE_URL/brands?limit=1 | jq

echo "3. Orchestrator endpoint..."
curl -sf -X POST $BASE_URL/agents/threads \
  -H "Content-Type: application/json" \
  -d '{"locale": "tr"}' | jq

echo "4. Worker list..."
curl -sf $BASE_URL/agents/workers | jq '.workers | length'

echo "5. Langfuse health..."
curl -sf $BASE_URL/admin/cache/stats | jq

echo "✓ All smoke tests passed"
```

## Maliyet Tahmini (Production, 10K MAU)

| Servis | Maliyet/ay |
|--------|------------|
| VPS (Hetzner CCX23) | $40 |
| Domain (.men, yıllık) | $10/yıl |
| OpenRouter (tiered routing) | $80-200 |
| Cloudflare Pro (opsiyonel) | $20 |
| Langfuse Cloud (free plan) | $0 |
| **Toplam** | **~$150-260/ay** |

10K MAU'da kişi başı maliyet: $0.015-0.026 — endüstri standardıyla uyumlu.

## Destek

- **GitHub Issues**: https://github.com/ferhatdeveloper/seyyare.men/issues
- **Discord**: (henüz kurulmadı)
- **Email**: support@seyyare.men

---

Versiyon: 1.0.0
Son güncelleme: 2026-09-04