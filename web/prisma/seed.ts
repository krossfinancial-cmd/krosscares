import {
  PrismaClient,
  TerritoryTrackerStatus,
  TerritoryTrackerTier,
  UserRole,
  Vertical,
  ZipStatus,
  ZipTier,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import territoryTrackerSeedData from "../src/data/territory-tracker-realtors.json";

const prisma = new PrismaClient();

type TerritoryTrackerSeedRow = {
  zipCode: string;
  city: string;
  county: string;
  population: number;
  density: number;
  tier: TerritoryTrackerTier;
  status: TerritoryTrackerStatus;
  statusDate: string | null;
};

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
  const dealerPassword = await bcrypt.hash("Dealer#2026!", 10);

  if (process.env.SEED_RESET === "true") {
    await prisma.session.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.onboardingForm.deleteMany();
    await prisma.leadRoute.deleteMany();
    await prisma.waitlist.deleteMany();
    await prisma.renewalReminder.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.territoryTrackerEntry.deleteMany();
    await prisma.zipInventory.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
  }

  const existingTerritoryTrackerEntries = await prisma.territoryTrackerEntry.count();
  if (existingTerritoryTrackerEntries < territoryTrackerSeedData.length) {
    const trackerRows = territoryTrackerSeedData as TerritoryTrackerSeedRow[];
    await prisma.territoryTrackerEntry.createMany({
      data: trackerRows.map((entry) => ({
        zipCode: entry.zipCode,
        city: entry.city,
        county: entry.county,
        population: entry.population,
        density: entry.density,
        tier: entry.tier,
        status: entry.status,
        statusDate: entry.statusDate ? new Date(entry.statusDate) : null,
      })),
      skipDuplicates: true,
    });
  }

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@krosscares.local" },
    update: {
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      fullName: "Platform Admin",
      companyName: "Kross Concepts",
      phone: "919-555-0101",
    },
    create: {
      email: "admin@krosscares.local",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      fullName: "Platform Admin",
      companyName: "Kross Concepts",
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
      phone: "919-555-0102",
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

  const dealerUser = await prisma.user.upsert({
    where: { email: "dealer@krosscares.local" },
    update: {
      passwordHash: dealerPassword,
      role: UserRole.DEALER,
      fullName: "Miles Dealer",
      companyName: "Capital Auto Group",
      phone: "919-555-0103",
    },
    create: {
      email: "dealer@krosscares.local",
      passwordHash: dealerPassword,
      role: UserRole.DEALER,
      fullName: "Miles Dealer",
      companyName: "Capital Auto Group",
      phone: "919-555-0103",
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
      vertical: Vertical.REALTOR,
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
      vertical: Vertical.REALTOR,
    },
  });

  const dealerClient = await prisma.client.upsert({
    where: { userId: dealerUser.id },
    update: {
      serviceCity: "Raleigh",
      serviceState: "NC",
      onboardingStatus: "ACTIVE",
      leadRoutingEmail: "dealer@krosscares.local",
      leadRoutingPhone: "919-555-0103",
      preferredContactMethod: "EMAIL",
      vertical: Vertical.DEALER,
    },
    create: {
      userId: dealerUser.id,
      serviceCity: "Raleigh",
      serviceState: "NC",
      onboardingStatus: "ACTIVE",
      leadRoutingEmail: "dealer@krosscares.local",
      leadRoutingPhone: "919-555-0103",
      preferredContactMethod: "EMAIL",
      vertical: Vertical.DEALER,
    },
  });

  for (const zip of SAMPLE_ZIPS) {
    for (const vertical of [Vertical.REALTOR, Vertical.DEALER]) {
      await prisma.zipInventory.upsert({
        where: {
          zipCode_vertical: {
            zipCode: zip.zipCode,
            vertical,
          },
        },
        update: {
          state: "NC",
          city: zip.city,
          county: zip.county,
          tier: zip.tier,
          annualPriceCents: zip.price,
          vertical,
        },
        create: {
          zipCode: zip.zipCode,
          state: "NC",
          city: zip.city,
          county: zip.county,
          tier: zip.tier,
          annualPriceCents: zip.price,
          status: ZipStatus.AVAILABLE,
          vertical,
        },
      });
    }
  }

  const ownedZip = await prisma.zipInventory.update({
    where: {
      zipCode_vertical: {
        zipCode: "27519",
        vertical: Vertical.REALTOR,
      },
    },
    data: {
      status: ZipStatus.SOLD,
      assignedClientId: realtorClient.id,
      renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      reservationExpiresAt: null,
    },
  });

  await prisma.leadRoute.upsert({
    where: {
      zipCode_vertical: {
        zipCode: "27519",
        vertical: Vertical.REALTOR,
      },
    },
    update: {
      clientId: realtorClient.id,
      destinationEmail: "realtor@krosscares.local",
      destinationPhone: "919-555-0102",
      vertical: Vertical.REALTOR,
      active: true,
    },
    create: {
      clientId: realtorClient.id,
      zipCode: "27519",
      vertical: Vertical.REALTOR,
      destinationEmail: "realtor@krosscares.local",
      destinationPhone: "919-555-0102",
      active: true,
    },
  });

  const dealerOwnedZip = await prisma.zipInventory.update({
    where: {
      zipCode_vertical: {
        zipCode: "28207",
        vertical: Vertical.DEALER,
      },
    },
    data: {
      status: ZipStatus.SOLD,
      assignedClientId: dealerClient.id,
      renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      reservationExpiresAt: null,
    },
  });

  await prisma.leadRoute.upsert({
    where: {
      zipCode_vertical: {
        zipCode: "28207",
        vertical: Vertical.DEALER,
      },
    },
    update: {
      clientId: dealerClient.id,
      destinationEmail: "dealer@krosscares.local",
      destinationPhone: "919-555-0103",
      vertical: Vertical.DEALER,
      active: true,
    },
    create: {
      clientId: dealerClient.id,
      zipCode: "28207",
      vertical: Vertical.DEALER,
      destinationEmail: "dealer@krosscares.local",
      destinationPhone: "919-555-0103",
      active: true,
    },
  });

  const realtorPaidExists = await prisma.payment.findFirst({
    where: { clientId: realtorClient.id, zipId: ownedZip.id, status: "PAID" },
  });
  if (!realtorPaidExists) {
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
  }

  const realtorSignedContract = await prisma.contract.findFirst({
    where: { clientId: realtorClient.id, zipId: ownedZip.id, status: "SIGNED" },
  });
  if (!realtorSignedContract) {
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
  }

  await prisma.onboardingForm.upsert({
    where: {
      clientId_zipId: {
        clientId: realtorClient.id,
        zipId: ownedZip.id,
      },
    },
    update: {
      status: "COMPLETED",
      submittedAt: new Date(),
      notes: "Seed onboarding complete",
    },
    create: {
      clientId: realtorClient.id,
      zipId: ownedZip.id,
      status: "COMPLETED",
      submittedAt: new Date(),
      notes: "Seed onboarding complete",
    },
  });

  const dealerPaidExists = await prisma.payment.findFirst({
    where: { clientId: dealerClient.id, zipId: dealerOwnedZip.id, status: "PAID" },
  });
  if (!dealerPaidExists) {
    await prisma.payment.create({
      data: {
        clientId: dealerClient.id,
        zipId: dealerOwnedZip.id,
        amountCents: 150000,
        provider: "mock",
        status: "PAID",
        paidAt: new Date(),
      },
    });
  }

  const dealerSignedContract = await prisma.contract.findFirst({
    where: { clientId: dealerClient.id, zipId: dealerOwnedZip.id, status: "SIGNED" },
  });
  if (!dealerSignedContract) {
    await prisma.contract.create({
      data: {
        clientId: dealerClient.id,
        zipId: dealerOwnedZip.id,
        status: "SIGNED",
        sentAt: new Date(),
        signedAt: new Date(),
        documentUrl: "https://example.local/contracts/demo-contract.pdf",
      },
    });
  }

  await prisma.onboardingForm.upsert({
    where: {
      clientId_zipId: {
        clientId: dealerClient.id,
        zipId: dealerOwnedZip.id,
      },
    },
    update: {
      status: "COMPLETED",
      submittedAt: new Date(),
      notes: "Seed onboarding complete",
    },
    create: {
      clientId: dealerClient.id,
      zipId: dealerOwnedZip.id,
      status: "COMPLETED",
      submittedAt: new Date(),
      notes: "Seed onboarding complete",
    },
  });

  const existingLeadCount = await prisma.lead.count();
  if (existingLeadCount === 0) {
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
          zipId: dealerOwnedZip.id,
          clientId: dealerClient.id,
          firstName: "Chris",
          lastName: "Lee",
          email: "chris.lee@example.com",
          phone: "919-555-0203",
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
    });
  }

  const seedLog = await prisma.auditLog.findFirst({
    where: {
      action: "seed.initialized",
      entityType: "system",
      entityId: "bootstrap",
    },
  });
  if (!seedLog) {
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
