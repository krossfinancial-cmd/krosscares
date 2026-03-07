import { prisma } from "@/lib/prisma";
import { formatCurrency, zipStatusColor } from "@/lib/format";

export default async function AdminZipsPage() {
  const zips = await prisma.zipInventory.findMany({
    include: {
      assignedClient: {
        include: {
          user: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { annualPriceCents: "desc" }],
  });

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-blue-950">ZIP Inventory Manager</h1>
      <table className="mt-4 w-full text-sm">
        <thead className="text-xs uppercase text-blue-700">
          <tr>
            <th className="py-2 text-left">ZIP</th>
            <th className="py-2 text-left">City</th>
            <th className="py-2 text-left">Tier</th>
            <th className="py-2 text-left">Vertical</th>
            <th className="py-2 text-left">Price</th>
            <th className="py-2 text-left">Status</th>
            <th className="py-2 text-left">Owner</th>
            <th className="py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {zips.map((zip) => (
            <tr key={zip.id} className="border-t border-blue-100">
              <td className="py-3 font-semibold text-blue-950">{zip.zipCode}</td>
              <td className="py-3 text-blue-900">{zip.city}, {zip.state}</td>
              <td className="py-3 text-blue-900">{zip.tier.replace("_", " ")}</td>
              <td className="py-3 text-blue-900">{zip.vertical}</td>
              <td className="py-3 text-blue-900">{formatCurrency(zip.annualPriceCents)}</td>
              <td className="py-3">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${zipStatusColor(zip.status)}`}>
                  {zip.status}
                </span>
              </td>
              <td className="py-3 text-blue-900">{zip.assignedClient?.user.email || "-"}</td>
              <td className="py-3 text-right">
                {zip.status !== "AVAILABLE" ? (
                  <form action="/api/admin/zips/release" method="post">
                    <input type="hidden" name="zipId" value={zip.id} />
                    <button className="secondary-btn text-xs" type="submit">
                      Release ZIP
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-blue-700/70">No action</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
