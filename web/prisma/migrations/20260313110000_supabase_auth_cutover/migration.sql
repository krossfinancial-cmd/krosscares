DROP TABLE IF EXISTS "public"."PasswordSetupToken";
DROP TABLE IF EXISTS "public"."Session";
ALTER TABLE "public"."User" DROP COLUMN IF EXISTS "passwordHash";
