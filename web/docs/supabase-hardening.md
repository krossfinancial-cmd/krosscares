# Supabase Hardening

This repo now applies a database lockdown migration that:

- revokes `anon` and `authenticated` grants across `public`
- revokes inherited `PUBLIC` schema usage on `public`
- enables RLS on application tables in `public`
- creates a `private` schema for future internal-only objects

There is still one Supabase project setting that is not stored in this repo:

1. Open Supabase Dashboard and go to `Project Settings -> Data API`.
2. Keep `public` exposed for now because the current Edge Functions use Supabase's Data API with the `service_role` key.
3. Do not grant `anon` or `authenticated` access to `public`. The migration in this repo already revokes schema usage, table grants, sequence grants, and function grants for those roles.
4. If you later migrate Edge Functions to direct database access, or to a dedicated server-only schema, then remove `public` from `Exposed schemas` and `Extra search path`.

If client-side table access is ever required later, add a dedicated API schema or sanitized views and grant access table-by-table with explicit RLS policies.

Do not expose `invoice_payments` or `stripe_events` directly. Use a server endpoint or a sanitized view keyed to the authenticated user instead.

Required secrets:

- `BACKEND_API_SHARED_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Local dev:

- `docker-compose.yml` now defaults `BACKEND_API_SHARED_SECRET` to `local-backend-secret`
- configure the same secret in the Supabase Edge Function environment before calling `backend-api`
