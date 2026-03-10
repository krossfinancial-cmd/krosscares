-- CreateEnum
CREATE TYPE "TerritoryTrackerTier" AS ENUM ('PREMIER', 'STANDARD', 'RURAL');

-- CreateEnum
CREATE TYPE "TerritoryTrackerStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- CreateTable
CREATE TABLE "TerritoryTrackerEntry" (
    "id" UUID NOT NULL,
    "zipCode" VARCHAR(5) NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "density" DOUBLE PRECISION NOT NULL,
    "tier" "TerritoryTrackerTier" NOT NULL,
    "status" "TerritoryTrackerStatus" NOT NULL DEFAULT 'AVAILABLE',
    "statusDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerritoryTrackerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryTrackerEntry_zipCode_key" ON "TerritoryTrackerEntry"("zipCode");

-- CreateIndex
CREATE INDEX "TerritoryTrackerEntry_status_idx" ON "TerritoryTrackerEntry"("status");

-- CreateIndex
CREATE INDEX "TerritoryTrackerEntry_tier_idx" ON "TerritoryTrackerEntry"("tier");

-- CreateIndex
CREATE INDEX "TerritoryTrackerEntry_county_idx" ON "TerritoryTrackerEntry"("county");

-- CreateIndex
CREATE INDEX "TerritoryTrackerEntry_city_idx" ON "TerritoryTrackerEntry"("city");
