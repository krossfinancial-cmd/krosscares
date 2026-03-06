-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'REALTOR');

-- CreateEnum
CREATE TYPE "public"."ZipStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."ZipTier" AS ENUM ('STANDARD', 'HIGH_DEMAND', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'DECLINED');

-- CreateEnum
CREATE TYPE "public"."OnboardingStatus" AS ENUM ('PENDING', 'FORM_COMPLETE', 'SIGNED', 'ACTIVE');

-- CreateEnum
CREATE TYPE "public"."OnboardingFormStatus" AS ENUM ('NOT_SENT', 'SENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ContactMethod" AS ENUM ('EMAIL', 'SMS', 'CALL');

-- CreateEnum
CREATE TYPE "public"."LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED', 'INVALID');

-- CreateEnum
CREATE TYPE "public"."WaitlistStatus" AS ENUM ('PENDING', 'NOTIFIED', 'CONVERTED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "licenseNumber" TEXT,
    "serviceCity" TEXT,
    "serviceState" TEXT,
    "website" TEXT,
    "calendarLink" TEXT,
    "headshotUrl" TEXT,
    "logoUrl" TEXT,
    "onboardingStatus" "public"."OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "leadRoutingEmail" TEXT,
    "leadRoutingPhone" TEXT,
    "preferredContactMethod" "public"."ContactMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ZipInventory" (
    "id" UUID NOT NULL,
    "zipCode" VARCHAR(5) NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "tier" "public"."ZipTier" NOT NULL,
    "annualPriceCents" INTEGER NOT NULL,
    "status" "public"."ZipStatus" NOT NULL DEFAULT 'AVAILABLE',
    "assignedClientId" UUID,
    "reservationExpiresAt" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZipInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "zipId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerSessionId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "zipId" UUID NOT NULL,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "documentUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OnboardingForm" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "zipId" UUID NOT NULL,
    "status" "public"."OnboardingFormStatus" NOT NULL DEFAULT 'NOT_SENT',
    "submittedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeadRoute" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "zipCode" VARCHAR(5) NOT NULL,
    "destinationEmail" TEXT NOT NULL,
    "destinationPhone" TEXT NOT NULL,
    "alertsEmail" BOOLEAN NOT NULL DEFAULT true,
    "alertsSms" BOOLEAN NOT NULL DEFAULT true,
    "crmIntegration" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" UUID NOT NULL,
    "zipId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "public"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Waitlist" (
    "id" UUID NOT NULL,
    "zipId" UUID NOT NULL,
    "zipCode" VARCHAR(5) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "status" "public"."WaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RenewalReminder" (
    "id" UUID NOT NULL,
    "zipId" UUID NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenewalReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_key" ON "public"."Client"("userId");

-- CreateIndex
CREATE INDEX "Client_onboardingStatus_idx" ON "public"."Client"("onboardingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ZipInventory_zipCode_key" ON "public"."ZipInventory"("zipCode");

-- CreateIndex
CREATE INDEX "ZipInventory_status_idx" ON "public"."ZipInventory"("status");

-- CreateIndex
CREATE INDEX "ZipInventory_state_city_idx" ON "public"."ZipInventory"("state", "city");

-- CreateIndex
CREATE INDEX "ZipInventory_tier_status_idx" ON "public"."ZipInventory"("tier", "status");

-- CreateIndex
CREATE INDEX "Payment_clientId_status_idx" ON "public"."Payment"("clientId", "status");

-- CreateIndex
CREATE INDEX "Payment_zipId_status_idx" ON "public"."Payment"("zipId", "status");

-- CreateIndex
CREATE INDEX "Contract_clientId_status_idx" ON "public"."Contract"("clientId", "status");

-- CreateIndex
CREATE INDEX "Contract_zipId_status_idx" ON "public"."Contract"("zipId", "status");

-- CreateIndex
CREATE INDEX "OnboardingForm_status_idx" ON "public"."OnboardingForm"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingForm_clientId_zipId_key" ON "public"."OnboardingForm"("clientId", "zipId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadRoute_zipCode_key" ON "public"."LeadRoute"("zipCode");

-- CreateIndex
CREATE INDEX "LeadRoute_clientId_idx" ON "public"."LeadRoute"("clientId");

-- CreateIndex
CREATE INDEX "Lead_clientId_status_idx" ON "public"."Lead"("clientId", "status");

-- CreateIndex
CREATE INDEX "Lead_zipId_idx" ON "public"."Lead"("zipId");

-- CreateIndex
CREATE INDEX "Waitlist_zipCode_status_idx" ON "public"."Waitlist"("zipCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RenewalReminder_zipId_daysBefore_key" ON "public"."RenewalReminder"("zipId", "daysBefore");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ZipInventory" ADD CONSTRAINT "ZipInventory_assignedClientId_fkey" FOREIGN KEY ("assignedClientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_zipId_fkey" FOREIGN KEY ("zipId") REFERENCES "public"."ZipInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_zipId_fkey" FOREIGN KEY ("zipId") REFERENCES "public"."ZipInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OnboardingForm" ADD CONSTRAINT "OnboardingForm_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OnboardingForm" ADD CONSTRAINT "OnboardingForm_zipId_fkey" FOREIGN KEY ("zipId") REFERENCES "public"."ZipInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeadRoute" ADD CONSTRAINT "LeadRoute_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_zipId_fkey" FOREIGN KEY ("zipId") REFERENCES "public"."ZipInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Waitlist" ADD CONSTRAINT "Waitlist_zipId_fkey" FOREIGN KEY ("zipId") REFERENCES "public"."ZipInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RenewalReminder" ADD CONSTRAINT "RenewalReminder_zipId_fkey" FOREIGN KEY ("zipId") REFERENCES "public"."ZipInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
