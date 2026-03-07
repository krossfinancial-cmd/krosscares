import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, zipStatusColor } from "@/lib/format";

type SearchParams = Promise<{
  error?: string;
}>;

export default async function DealerTerritoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await requireUser("DEALER");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return null;

  const zips = await prisma.zipInventory.findMany({
    where: { assignedClientId: client.id },
    orderBy: [{ status: "asc" }, { zipCode: "asc" }],
  });

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-blue-950">My Territories</h1>
      {params.error === "zip-not-assigned" ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          That ZIP is not assigned to your account.
        </div>
      ) : null}
      <div className="mt-5 space-y-3">
        {zips.map((zip) => (
          <div key={zip.id} className="rounded-xl border border-blue-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-blue-950">{zip.zipCode} · {zip.city}, {zip.state}</p>
                <p className="text-xs text-blue-900/70">Renewal: {zip.renewalDate ? zip.renewalDate.toDateString() : "Not active"}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-blue-950">{formatCurrency(zip.annualPriceCents)}</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${zipStatusColor(zip.status)}`}>{zip.status}</span>
              </div>
            </div>
            {zip.status === "RESERVED" && (
              <div className="mt-3 flex gap-2">
                <Link href={`/dashboard/dealer/checkout/${zip.id}`} className="primary-btn text-xs">Checkout</Link>
                <Link href={`/dashboard/dealer/onboarding/${zip.id}`} className="secondary-btn text-xs">Onboarding</Link>
              </div>
            )}
          </div>
        ))}
        {!zips.length && <p className="text-sm text-blue-900/70">No territories yet.</p>}
      </div>
    </div>
  );
}
