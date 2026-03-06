import { PrismaClient, UserRole, ZipStatus, ZipTier } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SAMPLE_ZIPS = [
  { zipCode: "28207", city: "Charlotte", county: "Mecklenburg", tier: ZipTier.PREMIUM, price: 150000 },
  { zipCode: "27608", city: "Raleigh", county: "Wake", tier: ZipTier.PREMIUM, price: 150000 },
  { zipCode: "27519", city: "Cary", county: "Wake", tier: ZipTier.HIGH_DEMAND, price: 100000 },
  { zipCode: "28173", city: "Waxhaw", county: "Union", tier: ZipTier.HIGH_DEMAND, price: 100000 },
  { zipCode: "28031", city: "Cornelius", county: "Mecklenburg", tier: ZipTier.STANDARD, price: 50000 },
  { zipCode: "28211", city: "Charlotte", county: "Mecklenburg", tier: ZipTier.STANDARD, price: 50000 },
  { zipCode: "27540", city: "Holly Springs", county: "Wake", tier: ZipTier.STANDARD, price: 50000 },
  { zipCode: "27587", city: "Wake Forest", county: "Wake", tier: ZipTier.STANDARD, price: 50000 },
];

async function main() {
  const adminPassword = await bcrypt.hash("Admin#2026!", 10);
  const realtorPassword = await bcrypt.hash("Realtor#2026!", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@krosscares.local" },
    update: {
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      fullName: "Platform Admin",
      companyName: "Kross Cares",
    },
    create: {
      email: "admin@krosscares.local",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      fullName: "Platform Admin",
      companyName: "Kross Cares",
      phone: "919-555-0101",
    },
  });

  const realtorUser = await prisma.user.upsert({
    where: { email: "realtor@krosscares.local" },
    update: {
      passwordHash: realtorPassword,
      role: UserRole.REALTOR,
      fullName: "Sasha Realtor",
      companyName: "Blue Ridge Realty",
    },
    create: {
      email: "realtor@krosscares.local",
      passwordHash: realtorPassword,
      role: UserRole.REALTOR,
      fullName: "Sasha Realtor",
      companyName: "Blue Ridge Realty",
      phone: "919-555-0102",
    },
  });

  const realtorClient = await prisma.client.upsert({
    where: { userId: realtorUser.id },
    update: {
      serviceCity: "Raleigh",
      serviceState: "NC",
      licenseNumber: "NC-RE-004274",
      onboardingStatus: "ACTIVE",
      leadRoutingEmail: "realtor@krosscares.local",
      leadRoutingPhone: "919-555-0102",
      preferredContactMethod: "EMAIL",
    },
    create: {
      userId: realtorUser.id,
      serviceCity: "Raleigh",
      serviceState: "NC",
      licenseNumber: "NC-RE-004274",
      onboardingStatus: "ACTIVE",
      leadRoutingEmail: "realtor@krosscares.local",
      leadRoutingPhone: "919-555-0102",
      preferredContactMethod: "EMAIL",
    },
  });

  for (const zip of SAMPLE_ZIPS) {
    await prisma.zipInventory.upsert({
      where: { zipCode: zip.zipCode },
      update: {
        state: "NC",
        city: zip.city,
        county: zip.county,
        tier: zip.tier,
        annualPriceCents: zip.price,
      },
      create: {
        zipCode: zip.zipCode,
        state: "NC",
        city: zip.city,
        county: zip.county,
        tier: zip.tier,
        annualPriceCents: zip.price,
        status: ZipStatus.AVAILABLE,
      },
    });
  }

  const ownedZip = await prisma.zipInventory.update({
    where: { zipCode: "27519" },
    data: {
      status: ZipStatus.SOLD,
      assignedClientId: realtorClient.id,
      renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      reservationExpiresAt: null,
    },
  });

  await prisma.leadRoute.upsert({
    where: { zipCode: "27519" },
    update: {
      clientId: realtorClient.id,
      destinationEmail: "realtor@krosscares.local",
      destinationPhone: "919-555-0102",
      active: true,
    },
    create: {
      clientId: realtorClient.id,
      zipCode: "27519",
      destinationEmail: "realtor@krosscares.local",
      destinationPhone: "919-555-0102",
      active: true,
    },
  });

  await prisma.payment.create({
    data: {
      clientId: realtorClient.id,
      zipId: ownedZip.id,
      amountCents: 100000,
      provider: "mock",
      status: "PAID",
      paidAt: new Date(),
    },
  });

  await prisma.contract.create({
    data: {
      clientId: realtorClient.id,
      zipId: ownedZip.id,
      status: "SIGNED",
      sentAt: new Date(),
      signedAt: new Date(),
      documentUrl: "https://example.local/contracts/demo-contract.pdf",
    },
  });

  await prisma.onboardingForm.create({
    data: {
      clientId: realtorClient.id,
      zipId: ownedZip.id,
      status: "COMPLETED",
      submittedAt: new Date(),
      notes: "Seed onboarding complete",
    },
  });

  await prisma.lead.createMany({
    data: [
      {
        zipId: ownedZip.id,
        clientId: realtorClient.id,
        firstName: "Jordan",
        lastName: "Carter",
        email: "jordan.carter@example.com",
        phone: "919-555-0201",
      },
      {
        zipId: ownedZip.id,
        clientId: realtorClient.id,
        firstName: "Alex",
        lastName: "Morgan",
        email: "alex.morgan@example.com",
        phone: "919-555-0202",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUser.id,
      action: "seed.initialized",
      entityType: "system",
      entityId: "bootstrap",
      metadata: {
        initializedAt: new Date().toISOString(),
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
