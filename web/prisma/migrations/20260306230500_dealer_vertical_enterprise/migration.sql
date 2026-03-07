-- CreateEnum
CREATE TYPE "public"."Vertical" AS ENUM ('REALTOR', 'DEALER');

-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'DEALER';

-- DropIndex
DROP INDEX "public"."LeadRoute_zipCode_key";

-- DropIndex
DROP INDEX "public"."Waitlist_zipCode_status_idx";

-- DropIndex
DROP INDEX "public"."ZipInventory_zipCode_key";

-- AlterTable
ALTER TABLE "public"."Client" ADD COLUMN     "vertical" "public"."Vertical" NOT NULL DEFAULT 'REALTOR';

-- AlterTable
ALTER TABLE "public"."LeadRoute" ADD COLUMN     "vertical" "public"."Vertical" NOT NULL DEFAULT 'REALTOR';

-- AlterTable
ALTER TABLE "public"."Waitlist" ADD COLUMN     "vertical" "public"."Vertical" NOT NULL DEFAULT 'REALTOR';

-- AlterTable
ALTER TABLE "public"."ZipInventory" ADD COLUMN     "vertical" "public"."Vertical" NOT NULL DEFAULT 'REALTOR';

-- CreateIndex
CREATE UNIQUE INDEX "LeadRoute_zipCode_vertical_key" ON "public"."LeadRoute"("zipCode", "vertical");

-- CreateIndex
CREATE INDEX "Waitlist_zipCode_status_vertical_idx" ON "public"."Waitlist"("zipCode", "status", "vertical");

-- CreateIndex
CREATE INDEX "ZipInventory_vertical_status_idx" ON "public"."ZipInventory"("vertical", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ZipInventory_zipCode_vertical_key" ON "public"."ZipInventory"("zipCode", "vertical");

