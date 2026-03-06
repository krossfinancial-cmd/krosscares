import { prisma } from "@/lib/prisma";

export async function getMarketplaceZips(filters: { search?: string; status?: string; tier?: string }) {
  const search = filters.search?.trim();
  const status = filters.status?.toUpperCase();
  const tier = filters.tier?.toUpperCase();

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
      ...(status && status !== "ALL" ? { status: status as never } : {}),
      ...(tier && tier !== "ALL" ? { tier: tier as never } : {}),
    },
    orderBy: [{ annualPriceCents: "desc" }, { zipCode: "asc" }],
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
