# Production Deployment Rehberi

## Gereksinimler

- VPS (Ubuntu 22.04+ veya Debian 12+) — minimum 4 vCPU, 8GB RAM, 80GB SSD
- Domain adı (`seyyare.men`) DNS ayarları yapılmış
- Email (Let's Encrypt bildirimleri için)

## Adım 1: VPS Kurulumu

```bash
# Docker + Compose
curl -fsSL https://get.docker.com | sh
sudo apt install -y docker-compose-plugin

# Firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Certbot (SSL)
sudo apt install -y certbot
```

## Adım 2: Repo Clone

```bash
sudo mkdir -p /opt/seyyare
cd /opt/seyyare
sudo git clone https://github.com/ferhatdeveloper/seyyare.men.git .
sudo chown -R $USER:$USER .
```

## Adım 3: Production Secrets

```bash
# Secret üret
./scripts/generate-secrets.sh > .env.production

# OPENROUTER_API_KEY'i ekle
nano .env.production
# OPENROUTER_API_KEY=sk-or-v1-... ekle
```

## Adım 4: Production Docker Compose

`docker-compose.prod.yml` (HTTPS + production override):

```yaml
# ... docker-compose.yml ile aynı + production override'lar
services:
  nginx:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
  postgrest:
    environment:
      PGRST_JWT_SECRET: ${PGRST_JWT_SECRET}
```

## Adım 5: SSL

```bash
# Wildcard değilse her subdomain için ayrı
sudo certbot certonly --nginx \
  -d seyyare.men \
  -d api.seyyare.men \
  -d ai.seyyare.men \
  -d auth.seyyare.men \
  -d storage.seyyare.men
```

## Adım 6: Stack'i Başlat

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose ps  # tüm servisler healthy olmalı
```

## Adım 7: DB Migration

Migration'lar otomatik olarak `docker-entrypoint-initdb.d` üzerinden çalışır. İlk çalıştırmada 10-20 sn bekleyin, sonra:

```bash
docker compose exec postgres psql -U seyyare -d seyyare -c "SELECT COUNT(*) FROM public.brands;"
# 31 marka dönene kadar bekle
```

## Adım 8: Mobil Uygulama Build

EAS Build ile production:

```bash
cd apps/mobile
eas build --platform android --profile production
eas build --platform ios --profile production
```

App Store / Play Store yayını için `eas submit` kullanın.

## Adım 9: Backup Stratejisi

```bash
# Cron job: her gece 03:00'te DB backup
0 3 * * * cd /opt/seyyare && docker compose exec -T postgres pg_dump -U seyyare seyyare | gzip > /backups/seyyare-$(date +\%Y\%m\%d).sql.gz

# MinIO backup (mc ile)
docker run --rm -v /opt/seyyare:/work minio/mc \
  mirror /work/minio-data s3://backup-bucket/seyyare/
```

## Monitoring

- **Logs**: `docker compose logs -f --tail=100`
- **pgAdmin**: http://YOUR_IP:5050 (production'da dışarıya kapatın)
- **Health checks**: `curl https://api.seyyare.men/healthz`

## Update Süreci

```bash
cd /opt/seyyare
git pull origin main
docker compose -f docker-compose.prod.yml build --no-cache api-auth ai-service
docker compose -f docker-compose.prod.yml up -d
```