CREATE SCHEMA IF NOT EXISTS "private";

COMMENT ON SCHEMA "private" IS 'Internal application objects not intended for Supabase Data API exposure.';

REVOKE ALL ON SCHEMA "private" FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA "private" FROM anon';
    EXECUTE 'REVOKE USAGE ON SCHEMA "public" FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA "public" FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "public" FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA "public" FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON TABLES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA "private" FROM authenticated';
    EXECUTE 'REVOKE USAGE ON SCHEMA "public" FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA "public" FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "public" FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA "public" FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON TABLES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM authenticated';
  END IF;
END $$;

DO $$
DECLARE
  record_row RECORD;
BEGIN
  FOR record_row IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'User',
        'Session',
        'Client',
        'ZipInventory',
        'TerritoryTrackerEntry',
        'Payment',
        'Contract',
        'OnboardingForm',
        'LeadRoute',
        'Lead',
        'Waitlist',
        'RenewalReminder',
        'AuditLog',
        'PasswordSetupToken',
        'stripe_events',
        'invoice_payments'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', record_row.tablename);
  END LOOP;
END $$;

-- Intentionally no anon/authenticated policies are added here.
-- Server-side Prisma access and service-role edge functions remain the only
-- supported data paths until a narrower client-side access model is designed.
