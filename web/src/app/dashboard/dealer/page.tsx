import Link from "next/link";
import { formatCurrency, formatZipTierLabel, zipStatusColor } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardOnboardingStatus } from "@/lib/invoice-payments";

type SearchParams = Promise<{
  welcome?: string;
  claimed_zip?: string;
  claim_error?: string;
  claim_zip?: string;
}>;

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function DealerOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await requireUser("DEALER");
  const client = await prisma.client.findUnique({
    where: { userId: user.id },
  });
  if (!client) return <div className="card p-6">Client profile missing.</div>;

  const [territories, leads] = await Promise.all([
    prisma.zipInventory.findMany({
      where: { assignedClientId: client.id },
      orderBy: [{ status: "asc" }, { annualPriceCents: "desc" }],
    }),
    prisma.lead.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const onboardingStatus = await getDashboardOnboardingStatus(client.onboardingStatus, client.id);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-blue-950">Welcome, {user.fullName}</h1>
        <p className="mt-2 text-sm font-bold text-red-600">
          Check your email within 24 hours for account activation steps
        </p>
        {params.claimed_zip ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ZIP {params.claimed_zip} has been reserved for your account.
          </div>
        ) : null}
        {params.claim_error ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {params.claim_zip ? `ZIP ${params.claim_zip}: ` : ""}
            {safeDecode(params.claim_error)}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Territories</p>
          <p className="mt-2 text-3xl font-bold text-blue-950">{territories.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Active Leads</p>
          <p className="mt-2 text-3xl font-bold text-blue-950">{leads.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Onboarding Status</p>
          <p className="mt-2 text-lg font-semibold text-blue-950">{onboardingStatus.replace("_", " ")}</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-950">My Territories</h2>
          <Link href="/marketplace" className="cta-btn text-xs">
            Claim New ZIP
          </Link>
        </div>
        <div className="space-y-3">
          {territories.map((zip) => (
            <div key={zip.id} className="rounded-xl border border-blue-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-blue-950">
                    {zip.zipCode} · {zip.city}, {zip.state}
                  </p>
                  <p className="text-sm text-blue-900/70">{formatZipTierLabel(zip.tier)} tier</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-950">{formatCurrency(zip.annualPriceCents)}</p>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${zipStatusColor(zip.status)}`}>
                    {zip.status}
                  </span>
                </div>
              </div>
              {zip.status === "RESERVED" && (
                <p className="mt-3 text-sm text-blue-900/70">
                  This territory is reserved for your account. A KC agent will contact you within 24 hours to complete activation.
                </p>
              )}
            </div>
          ))}
          {!territories.length && <p className="text-sm text-blue-900/70">No owned territories yet.</p>}
        </div>
      </div>
    </div>
  );
}
