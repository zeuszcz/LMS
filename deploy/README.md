# YES LMS — Production deploy

Stack on the VPS: nginx (host) → docker compose (lms-frontend:80, lms-backend:8000) → postgres / redis / minio (containers) → reuses `messenger-livekit` container for video.

## One-time setup (per host)

1. Point DNS: `A yes.innertalk.space → 170.168.72.200` (already up).
2. SSH to the VPS, install prerequisites if missing:
   ```bash
   sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx docker.io docker-compose-plugin rsync
   sudo systemctl enable --now docker nginx
   ```
3. Allow ports 80/443:
   ```bash
   sudo ufw allow 'Nginx Full'
   ```

## First deploy

From the workstation (`C:/.../LMS`):

```bash
cp deploy/.env.prod.example deploy/.env.prod
# Edit deploy/.env.prod and fill in JWT_SECRET, POSTGRES_PASSWORD, S3_SECRET_KEY,
# BOOTSTRAP_SUPERUSER_PASSWORD, SMTP_*, LIVEKIT_*

# (optional) configure SSH alias in ~/.ssh/config:
#   Host yes-vps
#     HostName 170.168.72.200
#     User i48ptgvnis
#     IdentityFile ~/.ssh/id_ed25519
# Otherwise: VPS_HOST=user@ip ./deploy/deploy.sh

bash deploy/deploy.sh
```

The script:
1. rsyncs the repo to `/opt/yes-lms` on the VPS
2. builds and starts `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d`
3. installs `deploy/nginx-host.conf` to `/etc/nginx/sites-available/yes.innertalk.space`
4. issues a Let's Encrypt cert via webroot challenge (skipped if already present)

## Updating

Same script — rsync + `docker compose build && up -d`. Migrations run on backend container start (`alembic upgrade head`).

```bash
bash deploy/deploy.sh
```

## Reusing the messenger LiveKit

The messenger already runs LiveKit at `wss://livekit.innertalk.space`. Set:

```env
LIVEKIT_URL=wss://livekit.innertalk.space
LIVEKIT_API_KEY=<copy from messenger .env>
LIVEKIT_API_SECRET=<copy from messenger .env>
```

The LMS issues its own room names (`lesson-<uuid>`), so there is no clash with messenger calls.

## Troubleshooting

- Logs: `ssh yes-vps 'cd /opt/yes-lms/deploy && docker compose -f docker-compose.prod.yml logs -f --tail 100 backend worker'`
- Restart: `docker compose -f docker-compose.prod.yml restart backend worker beat`
- Open shell: `docker exec -it lms-backend bash`
- Reset DB (DESTRUCTIVE): `docker compose -f docker-compose.prod.yml down -v` (drops postgres-data, minio-data)
