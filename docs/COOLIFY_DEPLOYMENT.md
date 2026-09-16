# SigmaGo Coolify Production Deployment Guide

This guide provides explicit, step-by-step instructions for deploying SigmaGo to a production Coolify instance with an independent web process, background worker, Redis resource, scheduled tasks, and OpenTelemetry observability.

---

## 1. High-Level Architecture on Coolify

```
               [ Internet / DNS ]
                       │
                       ▼
       [ Coolify Proxy (Traefik / Caddy) ]
                       │
                       ▼
      [ Resource 1: sigmago-web (Port 3000) ]
        Next.js Standalone Container
        Healthcheck: /api/health/live
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   [ Supabase ]    [ Redis ]   [ Resource 2: sigmago-worker ]
   PostgreSQL/Auth  Coolify     Background BullMQ Consumer
   /Storage        Service      Heartbeat + Outbox Loop
                       │
                       ▼
             [ Scheduled Tasks ]
             - npm run job:digest
             - npm run job:nudge
             - npm run job:validity-nudge
             - npm run job:platform-monitor
```

---

## 2. Resources to Create in Coolify

Create a dedicated Project in Coolify (e.g. `SigmaGo Production`):

| Resource Name | Type | Source / Dockerfile | Description |
| :--- | :--- | :--- | :--- |
| **`sigmago-redis`** | Service / Database | `redis:7-alpine` | Dedicated internal Redis instance |
| **`sigmago-web`** | Application | Git Repository (`Dockerfile`) | Production web server running on port 3000 |
| **`sigmago-worker`** | Application | Git Repository (`Dockerfile.worker`) | Standalone background processor & queues |
| **`sigmago-otel`** *(Optional)* | Docker Compose | `infra/observability/docker-compose.otel.yml` | Self-hosted OTel Collector & Grafana stack |

---

## 3. Resource Configuration Details

### Resource 1: Redis (`sigmago-redis`)
1. In Coolify, click **+ Add Resource** → **Databases** → **Redis**.
2. Set Redis password if required.
3. Note the internal service connection string, e.g.:
   ```text
   redis://default:<password>@sigmago-redis:6379
   ```
4. Keep Redis private (do NOT check "Expose publicly").

---

### Resource 2: Web Process (`sigmago-web`)
1. Click **+ Add Resource** → **Applications** → **Public/Private Repository**.
2. **Repository URL**: `https://github.com/luckykiran2024/SigmaGo.git`
3. **Branch**: `main`
4. **Build Pack**: `Dockerfile`
5. **Dockerfile Path**: `/Dockerfile`
6. **Port**: `3000`
7. **Domains**: `https://app.sigmago.tech` (or wildcard `https://*.sigmago.tech` for multi-tenant subdomains)
8. **Health Check Path**: `/api/health/live`
9. **Environment Variables**:
   Add all variables from `.env.example`:
   - `DATABASE_URL` (Supabase pooled connection string `postgres://...:6543/postgres?pgbouncer=true`)
   - `DIRECT_URL` (Supabase direct connection string `postgres://...:5432/postgres`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL=https://app.sigmago.tech`
   - `REDIS_URL=redis://default:<password>@sigmago-redis:6379`
   - `CRON_SECRET=<generated_64_char_token>`
   - `RESEND_API_KEY=<key>`
   - `EMAIL_FROM=notifications@sigmago.tech`
   - `PLATFORM_ADMIN_EMAILS`
   - `PLATFORM_SIGNING_KEY_ID`
   - `PLATFORM_SIGNING_PRIVATE_KEY_PEM`
   - `SECRET_ACTIVE_KEY_VERSION`
   - `SECRET_ENCRYPTION_KEY`
   - `SECRET_KEY_RING`
   - `SIGMAGO_PROCESS_ROLE=web`

---

### Resource 3: Background Worker (`sigmago-worker`)
1. Click **+ Add Resource** → **Applications** → **Public/Private Repository**.
2. **Build Pack**: `Dockerfile`
3. **Dockerfile Path**: `/Dockerfile.worker`
4. **Ports Expose**: None (Worker does not listen to public web traffic).
5. **Environment Variables**:
   Copy identical environment variables from `sigmago-web`, adjusting:
   - `SIGMAGO_PROCESS_ROLE=worker`
   - `WORKER_CONCURRENCY=5`
   - `ENABLE_OUTBOX_WORKER=false` (or `true` if transactional outbox dispatch is enabled)
   - `OTEL_SERVICE_NAME=sigmago-worker`

---

## 4. Coolify Scheduled Tasks (Cron Automation)

Do **NOT** trigger public HTTP web requests for scheduled tasks. Instead, use Coolify's native **Scheduled Tasks** feature attached to the `sigmago-worker` or `sigmago-web` container.

In the container's **Scheduled Tasks** tab, add:

| Task Name | Cron Expression | Command to Execute |
| :--- | :--- | :--- |
| **Overdue Reminders Nudge** | `0 * * * *` (Hourly) | `npm run job:nudge` |
| **Validity & Expiry Scan** | `0 0 * * *` (Daily at 00:00) | `npm run job:validity-nudge` |
| **Decision Digest** | `0 8 * * 1` (Mondays at 08:00) | `npm run job:digest` |
| **Platform Health Monitor** | `*/5 * * * *` (Every 5 mins) | `npm run job:platform-monitor` |

*Note: All scheduled jobs automatically acquire a distributed Redis lock (`sigmago:job:<name>`) to prevent duplicate executions across replicas.*

---

## 5. Database Migrations on Coolify

To ensure fail-closed, single-runner migration execution:

### First-Time Deployment:
1. Before starting the web replicas, open the terminal in Coolify or run in a one-off task:
   ```bash
   npm run migrate:deploy
   ```
2. Verify all migrations in `prisma/migrations` have been applied.

### Subsequent Automated Deployments:
In `sigmago-web` → **Advanced Configuration** → **Pre-Deployment Command**:
```bash
npx prisma migrate deploy
```
*Note: Never run `prisma db push` in production.*

---

## 6. Verification and Troubleshooting

- **Web Liveness**: `curl -f https://app.sigmago.tech/api/health/live` returns `{"status":"ok","service":"sigmago-web"}`
- **Web Readiness**: `curl -f https://app.sigmago.tech/api/health/ready` returns `{"status":"ok", "checks":{"database":{"status":"healthy"}}}`
- **Worker Heartbeat**: Connect to Redis: `redis-cli GET sigmago:worker:heartbeat` should show recent timestamp and uptime.
