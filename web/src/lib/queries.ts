import { Prisma, Vertical, ZipStatus, ZipTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const STATUS_WHITELIST = new Set(["AVAILABLE", "RESERVED", "SOLD", "BLOCKED"]);
const TIER_WHITELIST = new Set(["STANDARD", "HIGH_DEMAND", "PREMIUM"]);
const VERTICAL_WHITELIST = new Set(["REALTOR", "DEALER"]);

export async function getMarketplaceZips(filters: { search?: string; status?: string; tier?: string; vertical?: string }) {
  const search = filters.search?.trim();
  const status = filters.status?.toUpperCase() || "ALL";
  const tier = filters.tier?.toUpperCase() || "ALL";
  const vertical = filters.vertical?.toUpperCase() || "ALL";
  const now = new Date();

  const safeStatus: "ALL" | ZipStatus =
    status === "ALL" ? "ALL" : STATUS_WHITELIST.has(status) ? (status as ZipStatus) : "ALL";
  const safeTier: "ALL" | ZipTier =
    tier === "ALL" ? "ALL" : TIER_WHITELIST.has(tier) ? (tier as ZipTier) : "ALL";
  const safeVertical: "ALL" | Vertical =
    vertical === "ALL" ? "ALL" : VERTICAL_WHITELIST.has(vertical) ? (vertical as Vertical) : "ALL";

  const where: Prisma.ZipInventoryWhereInput = {
    ...(safeTier !== "ALL" ? { tier: safeTier } : {}),
    ...(safeVertical !== "ALL" ? { vertical: safeVertical } : {}),
  };

  const andFilters: Prisma.ZipInventoryWhereInput[] = [];

  if (search) {
    andFilters.push({
      OR: [{ zipCode: { contains: search, mode: "insensitive" } }, { city: { contains: search, mode: "insensitive" } }],
    });
  }

  if (safeStatus === "AVAILABLE") {
    andFilters.push({
      OR: [
        { status: "AVAILABLE" },
        {
          status: "RESERVED",
          reservationExpiresAt: {
            lte: now,
          },
        },
      ],
    });
  } else if (safeStatus === "RESERVED") {
    andFilters.push({
      status: "RESERVED",
      OR: [{ reservationExpiresAt: null }, { reservationExpiresAt: { gt: now } }],
    });
  } else if (safeStatus !== "ALL") {
    andFilters.push({
      status: safeStatus,
    });
  }

  if (andFilters.length) {
    where.AND = andFilters;
  }

  return prisma.zipInventory.findMany({
    where,
    orderBy: [{ annualPriceCents: "desc" }, { vertical: "asc" }, { zipCode: "asc" }],
  });
}

export async function getDashboardMetrics() {
  const [totalZips, soldZips, reservedZips, availableZips, totalRevenue, upcomingRenewals] = await Promise.all([
    prisma.zipInventory.count(),
    prisma.zipInventory.count({ where: { status: "SOLD" } }),
    prisma.zipInventory.count({ where: { status: "RESERVED" } }),
    prisma.zipInventory.count({ where: { status: "AVAILABLE" } }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amountCents: true },
    }),
    prisma.zipInventory.count({
      where: {
        status: "SOLD",
        renewalDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    totalZips,
    soldZips,
    reservedZips,
    availableZips,
    totalRevenueCents: totalRevenue._sum.amountCents ?? 0,
    upcomingRenewals,
  };
}
