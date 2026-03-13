ALTER TABLE "public"."invoice_payments" REPLICA IDENTITY FULL;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE "public"."invoice_payments";
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
