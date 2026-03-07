import { prisma } from "@/lib/prisma";

const STATUS_WHITELIST = new Set(["AVAILABLE", "RESERVED", "SOLD", "BLOCKED"]);
const TIER_WHITELIST = new Set(["STANDARD", "HIGH_DEMAND", "PREMIUM"]);
const VERTICAL_WHITELIST = new Set(["REALTOR", "DEALER"]);

export async function getMarketplaceZips(filters: { search?: string; status?: string; tier?: string; vertical?: string }) {
  const search = filters.search?.trim();
  const status = filters.status?.toUpperCase() || "ALL";
  const tier = filters.tier?.toUpperCase() || "ALL";
  const vertical = filters.vertical?.toUpperCase() || "ALL";

  const safeStatus = status === "ALL" ? "ALL" : STATUS_WHITELIST.has(status) ? status : "ALL";
  const safeTier = tier === "ALL" ? "ALL" : TIER_WHITELIST.has(tier) ? tier : "ALL";
  const safeVertical = vertical === "ALL" ? "ALL" : VERTICAL_WHITELIST.has(vertical) ? vertical : "ALL";

  return prisma.zipInventory.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { zipCode: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(safeStatus !== "ALL" ? { status: safeStatus as never } : {}),
      ...(safeTier !== "ALL" ? { tier: safeTier as never } : {}),
      ...(safeVertical !== "ALL" ? { vertical: safeVertical as never } : {}),
    },
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
