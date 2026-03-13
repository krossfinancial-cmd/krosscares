import { prisma } from "@/lib/prisma";

export default async function AdminRenewalsPage() {
  const renewals = await prisma.zipInventory.findMany({
    where: {
      status: "SOLD",
      renewalDate: { not: null },
    },
    include: {
      assignedClient: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { renewalDate: "asc" },
  });

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-blue-950">Renewal Queue</h1>
        <p className="mt-2 text-sm text-blue-900/70">
          Manual admin trigger for the renewal worker. Production cron jobs can call the same endpoint with the internal cron secret.
        </p>
        <form action="/api/internal/renewals/run" method="post" className="mt-4">
          <button className="primary-btn" type="submit">
            Run Renewal Worker Now
          </button>
        </form>
      </div>

      <div className="card p-6">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-blue-700">
            <tr>
              <th className="py-2 text-left">ZIP</th>
              <th className="py-2 text-left">Owner</th>
              <th className="py-2 text-left">Renewal Date</th>
            </tr>
          </thead>
          <tbody>
            {renewals.map((zip) => (
              <tr key={zip.id} className="border-t border-blue-100">
                <td className="py-3 font-semibold text-blue-950">{zip.zipCode}</td>
                <td className="py-3 text-blue-900">{zip.assignedClient?.user.email || "-"}</td>
                <td className="py-3 text-blue-900">{zip.renewalDate?.toDateString() || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
