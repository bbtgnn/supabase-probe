# Supabase Probe (Coolify-ready)

Minimal JavaScript full-stack app:
- backend: Express API with Postgres connectivity check
- frontend: single status page

## What it does

- `GET /api/status` runs `SELECT 1` on the configured database and returns app/db status.
- `GET /api/healthz` returns app-only health.
- `/` serves a static page that calls `/api/status`.

## Local run

1. Copy env template:
   - `cp .env.example .env`
2. Fill `DATABASE_URL` with your self-hosted Supabase Postgres DSN.
3. Install and run:
   - `npm install`
   - `npm run dev`
4. Open `http://localhost:3000`.

## Run with Docker Compose

1. Open `docker-compose.yml` and set your values in `services.app.environment`:
   - `DATABASE_URL`
   - `PORT`
   - optional `DB_SSL` and `DB_SSL_REJECT_UNAUTHORIZED`
2. Build and start:
   - `docker compose up --build -d`
3. View logs:
   - `docker compose logs -f app`
4. Stop:
   - `docker compose down`

## Deploy on Coolify (same project)

Create one application in your Coolify project:
- **Build Pack**: Dockerfile
- **Port**: `3000`
- **Required env**:
  - `DATABASE_URL`
  - `PORT=3000`
  - optional: `DB_SSL=true` when needed

Point `DATABASE_URL` to your Supabase Postgres service reachable from that Coolify environment (internal hostname is typically your service/container name).
