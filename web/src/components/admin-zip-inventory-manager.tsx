import { prisma } from "@/lib/prisma";
import { formatCurrency, zipStatusColor } from "@/lib/format";

type SearchParams = {
  assigned?: string;
  reassigned?: string;
  released?: string;
  invited?: string;
  error?: string;
};

export async function AdminZipInventoryManager({ searchParams }: { searchParams: SearchParams }) {
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
  const clients = await prisma.client.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-blue-950">ZIP Inventory Manager</h1>
      <p className="mt-1 text-sm text-blue-900/70">
        Assign available ZIPs to existing clients, enroll new clients from the row dropdown, reassign, or release claimed ZIPs.
      </p>
      {searchParams.assigned === "1" ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ZIP assigned and activated.
        </div>
      ) : null}
      {searchParams.invited === "1" ? (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Invite email sent. The customer can set their password from the link in their inbox.
        </div>
      ) : null}
      {searchParams.reassigned === "1" ? (
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          ZIP reassigned and routing switched to the new owner.
        </div>
      ) : null}
      {searchParams.released === "1" ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ZIP released and routing disabled.
        </div>
      ) : null}
      {searchParams.error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}
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
                {zip.status === "AVAILABLE" ? (
                  (() => {
                    const matchingClients = clients.filter((client) => client.vertical === zip.vertical);
                    return (
                      <form action="/api/admin/zips/assign" method="post" className="flex items-center justify-end gap-2">
                        <input type="hidden" name="zipId" value={zip.id} />
                        <select
                          name="clientId"
                          required
                          className="max-w-[210px] rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs text-blue-950"
                        >
                          <option value="">Select client</option>
                          {matchingClients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.user.fullName} ({client.user.email})
                            </option>
                          ))}
                          <option value="__new__">+ Enroll new client for this ZIP</option>
                        </select>
                        <button className="primary-btn px-3 py-1.5 text-xs" type="submit">
                          Assign
                        </button>
                      </form>
                    );
                  })()
                ) : (
                  (() => {
                    const matchingClients = clients.filter((client) => client.vertical === zip.vertical);
                    return (
                      <div className="flex flex-col items-end gap-2">
                        <form action="/api/admin/zips/reassign" method="post" className="flex items-center gap-2">
                          <input type="hidden" name="zipId" value={zip.id} />
                          <select
                            name="clientId"
                            required
                            defaultValue={zip.assignedClientId || ""}
                            className="max-w-[210px] rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs text-blue-950"
                          >
                            <option value="">Select client</option>
                            {matchingClients.map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.user.fullName} ({client.user.email})
                              </option>
                            ))}
                            <option value="__new__">+ Enroll new client for this ZIP</option>
                          </select>
                          <button className="primary-btn px-3 py-1.5 text-xs" type="submit">
                            Reassign
                          </button>
                        </form>
                        <form action="/api/admin/zips/release" method="post">
                          <input type="hidden" name="zipId" value={zip.id} />
                          <button className="secondary-btn text-xs" type="submit">
                            Release ZIP
                          </button>
                        </form>
                      </div>
                    );
                  })()
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
