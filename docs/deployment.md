# Tofaş Fen Webapp — Hostinger Compose Deployment Runbook

This document covers the day-1 and day-2 deployment of the Tofaş Fen webapp on a Hostinger VPS using Docker Compose.

K8s manifests in `k8s/` are aspirational; secrets management for K8s is tracked separately under I-C2 / I-H10.

## 1. Prerequisites

- Hostinger VPS with at least 2 vCPU, 4 GB RAM, 40 GB disk
- Domain pointing to the VPS (A record)
- TLS certificate (Let's Encrypt via certbot — instructions below)
- Docker Engine ≥ 24 + compose plugin
- `git`, `openssl`, and a password manager you trust

## 2. Initial setup

```bash
ssh root@<vps-host>
adduser tofas && usermod -aG docker tofas
sudo -iu tofas
git clone https://github.com/iWeslax83/tofas-fen-webapp.git /srv/tofas-fen
cd /srv/tofas-fen
```

## 3. Generate secrets

```bash
cd server && npm run generate-secrets > /tmp/secrets.txt
```

This emits values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. Record them in your password manager **before** moving them into `.env`.

## 4. Create `.env`

```bash
cd /srv/tofas-fen
cp server/.env.example .env
$EDITOR .env
```

### Required env vars

| Variable                                           | Source                                 | Notes                                                        |
| -------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `MONGO_PASSWORD`                                   | generate via `openssl rand -base64 24` | Mongo root password                                          |
| `JWT_SECRET`                                       | from step 3                            | Access-token signing key                                     |
| `JWT_REFRESH_SECRET`                               | from step 3                            | Refresh-token signing key                                    |
| `ENCRYPTION_KEY`                                   | from step 3                            | **Required** — backend fail-closes without it. 64 hex chars. |
| `REDIS_PASSWORD`                                   | `openssl rand -base64 24`              | Redis password                                               |
| `FRONTEND_URL`                                     | `https://yourdomain.tld`               | CORS origin + cookie domain                                  |
| `MONGODB_TLS`                                      | `false` (default)                      | Set `true` only if Mongo has its own TLS cert                |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | your SMTP provider                     | Email delivery                                               |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`            | from step 3                            | Push notifications                                           |
| `SENTRY_DSN`                                       | from sentry.io                         | Optional but recommended                                     |

Lock the file down:

```bash
chmod 600 .env
```

## 5. TLS

Quickest path is certbot in standalone mode before nginx is bound to :443:

```bash
sudo certbot certonly --standalone -d yourdomain.tld
sudo cp /etc/letsencrypt/live/yourdomain.tld/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.tld/privkey.pem nginx/ssl/key.pem
sudo chown -R tofas:tofas nginx/ssl
openssl dhparam -out nginx/ssl/dhparam.pem 2048
```

(Renewal: certbot installs a systemd timer; copy the renewed cert into `nginx/ssl/` via a post-renewal hook, or symlink.)

## 6. First deploy

```bash
cd /srv/tofas-fen
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d
```

Verify:

```bash
docker compose ps
docker compose logs -f backend | head -50
curl -kI https://yourdomain.tld/health
```

## 7. Day-2 ops

### Update

```bash
cd /srv/tofas-fen
git pull
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d
docker image prune -f
```

### Backup

Mongo:

```bash
docker compose exec mongodb mongodump --archive --gzip \
  -u admin -p "$MONGO_PASSWORD" --authenticationDatabase admin \
  > /srv/backups/mongo-$(date +%Y%m%d-%H%M%S).archive.gz
```

Recommended: rotate via a cron entry — keep 7 daily, 4 weekly, 12 monthly.

### Rollback

```bash
cd /srv/tofas-fen
git log --oneline -5
git checkout <previous-commit>
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d --build
```

### Logs

```bash
docker compose logs -f backend frontend nginx
```

Backend writes to a named volume `backend_logs`; tail with:

```bash
docker compose exec backend tail -f /app/logs/combined.log
```

## 8. Secrets rotation

### Rotate `JWT_SECRET` / `JWT_REFRESH_SECRET`

1. Update the value in `.env`.
2. `docker compose ... up -d backend`.
3. All existing tokens are invalidated; users re-login.

### Rotate `ENCRYPTION_KEY`

**Non-trivial.** Encrypted-at-rest fields (TCKN) need a re-encryption migration. Plan:

1. Add a `KEY_ROLLOVER_OLD=<old key>` env var.
2. Run a one-off migration that decrypts each `tckn` with the old key and re-encrypts with the new.
3. Remove `KEY_ROLLOVER_OLD`.

This migration is **not yet implemented** — open an issue before rotating.

### Rotate `MONGO_PASSWORD` / `REDIS_PASSWORD`

1. Update `.env`.
2. Stop services: `docker compose ... stop`.
3. Update the Mongo / Redis user via direct shell (`mongosh` / `redis-cli`).
4. Restart: `docker compose ... up -d`.

## 9. Future migration

K8s manifests in `k8s/` are maintained as the future migration target. When migrating:

- Adopt SealedSecrets / SOPS / external-secrets-operator (I-C2 / I-H10 spec — to be written)
- Mirror the staging namespace's PSA + ResourceQuota + LimitRange into production (N-H6)

## 10. Troubleshooting

| Symptom                                            | Likely cause                             | Fix                                                                                           |
| -------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Backend crash-loops with `ENCRYPTION_KEY required` | Missing or empty in `.env`               | Set the var; restart                                                                          |
| nginx 413 on bulk import                           | Body-size limit                          | Already raised to 5MB in nginx.conf; check upstream proxies (Cloudflare, etc.)                |
| 401 on every API call after a deploy               | JWT secret rotated without coordinating  | Users need to re-login                                                                        |
| Login page never finishes loading                  | `FRONTEND_URL` mismatch with actual host | Match `.env` to the URL the browser uses                                                      |
| `Cannot connect to mongo`                          | Mongo container slow to come up          | `depends_on.condition: service_healthy` should handle it; check `docker compose logs mongodb` |
