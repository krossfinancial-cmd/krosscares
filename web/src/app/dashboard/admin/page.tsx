import { getDashboardMetrics } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { isDatabaseUnavailableError } from "@/lib/database-errors";
import { prisma } from "@/lib/prisma";

async function getRecentPaidPayments() {
  return prisma.payment.findMany({
    where: { status: "PAID" },
    include: { zip: true, client: { include: { user: true } } },
    orderBy: { paidAt: "desc" },
    take: 5,
  });
}

export default async function AdminOverviewPage() {
  let inventoryUnavailable = false;
  let metrics = {
    totalZips: 0,
    soldZips: 0,
    reservedZips: 0,
    availableZips: 0,
    totalRevenueCents: 0,
    upcomingRenewals: 0,
  };
  let recentPayments: Awaited<ReturnType<typeof getRecentPaidPayments>> = [];

  try {
    metrics = await getDashboardMetrics();
    recentPayments = await getRecentPaidPayments();
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }

    inventoryUnavailable = true;
    console.error("Admin dashboard metrics query failed because the database is unavailable.", error);
  }

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-blue-950">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-blue-900/70">Marketplace performance and lifecycle operations.</p>
        {inventoryUnavailable ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Dashboard metrics are temporarily unavailable while the database reconnects. Please try again shortly.
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="card p-5"><p className="text-xs text-blue-600">Total ZIPs</p><p className="text-2xl font-bold text-blue-950">{metrics.totalZips}</p></div>
        <div className="card p-5"><p className="text-xs text-blue-600">Sold</p><p className="text-2xl font-bold text-blue-950">{metrics.soldZips}</p></div>
        <div className="card p-5"><p className="text-xs text-blue-600">Reserved</p><p className="text-2xl font-bold text-blue-950">{metrics.reservedZips}</p></div>
        <div className="card p-5"><p className="text-xs text-blue-600">Revenue</p><p className="text-2xl font-bold text-blue-950">{formatCurrency(metrics.totalRevenueCents)}</p></div>
        <div className="card p-5"><p className="text-xs text-blue-600">Renewals (60d)</p><p className="text-2xl font-bold text-blue-950">{metrics.upcomingRenewals}</p></div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-blue-950">Recent Paid Purchases</h2>
        <table className="mt-4 w-full text-sm">
          <thead className="text-xs uppercase text-blue-700">
            <tr>
              <th className="py-2 text-left">Client</th>
              <th className="py-2 text-left">ZIP</th>
              <th className="py-2 text-left">Amount</th>
              <th className="py-2 text-left">Paid At</th>
            </tr>
          </thead>
          <tbody>
            {recentPayments.map((payment) => (
              <tr key={payment.id} className="border-t border-blue-100">
                <td className="py-3 text-blue-900">{payment.client.user.fullName}</td>
                <td className="py-3 text-blue-900">{payment.zip.zipCode}</td>
                <td className="py-3 font-semibold text-blue-950">{formatCurrency(payment.amountCents)}</td>
                <td className="py-3 text-blue-900">{payment.paidAt?.toDateString() || "-"}</td>
              </tr>
            ))}
            {!recentPayments.length ? (
              <tr className="border-t border-blue-100">
                <td colSpan={4} className="py-6 text-center text-blue-700">
                  {inventoryUnavailable ? "Recent purchases are temporarily unavailable." : "No paid purchases yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
