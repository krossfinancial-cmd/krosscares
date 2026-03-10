# Kross Concepts Territory SaaS (Local-First)

Premium blue/white Next.js SaaS for exclusive ZIP territory sales and lifecycle operations.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind)
- Supabase Postgres (primary database)
- Supabase Edge Function (`backend-api`) for API workflows
- Prisma (read-model compatibility layer during UI transition)
- Redis
- MinIO (headshots/logos)
- Mailpit (email inbox)
- Docker Compose orchestration

## Run Locally

```bash
docker compose up -d db
cd web
npm run db:generate
npm run db:migrate
npm run db:seed   # run when you want to reset local demo data
npm run dev
```

Optional full stack services (Redis, MinIO, Mailpit, scheduler):

```bash
docker compose --profile full up --build
```

## Local URLs

- App: http://localhost:3000
- Mailpit: http://localhost:8025
- MinIO Console: http://localhost:9001
- Health check: http://localhost:3000/api/health

## Demo Credentials

- Admin: `admin@krosscares.local` / `Admin#2026!`
- Realtor: `realtor@krosscares.local` / `Realtor#2026!`
- Dealer: `dealer@krosscares.local` / `Dealer#2026!`

## Implemented Phases (Docker-First)

1. Local infra and service orchestration.
2. Core schema + migrations + seed.
3. Marketplace and ZIP reservation flow.
4. Mock checkout, contract status, onboarding, activation gate.
5. Realtor dashboard (territories, leads, routing, billing).
6. Admin dashboard (inventory, clients, renewals, release actions).
7. Renewal worker, dunning simulation, waitlist notifications.
8. Local QA and flow docs.
9. Dealer vertical parity and dual-vertical ZIP inventory (`zip + vertical` ownership).
10. Enterprise baseline hardening (rate limits, health endpoint, env validation, audit logging).

Phase 9 (Supabase cutover) is now active for API and database backend.
