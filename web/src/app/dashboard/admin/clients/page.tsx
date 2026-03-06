import { prisma } from "@/lib/prisma";

export default async function AdminClientsPage() {
  const clients = await prisma.client.findMany({
    include: {
      user: true,
      territories: true,
      contracts: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-blue-950">Client Management</h1>
      <div className="mt-4 space-y-3">
        {clients.map((client) => {
          const paidPayments = client.payments.filter((p) => p.status === "PAID").length;
          const signedContracts = client.contracts.filter((c) => c.status === "SIGNED").length;
          return (
            <div key={client.id} className="rounded-xl border border-blue-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-blue-950">{client.user.fullName}</p>
                  <p className="text-sm text-blue-900/70">{client.user.email}</p>
                </div>
                <div className="text-right text-xs text-blue-900">
                  <p>Onboarding: <strong>{client.onboardingStatus.replace("_", " ")}</strong></p>
                  <p>Territories: <strong>{client.territories.length}</strong></p>
                  <p>Paid: <strong>{paidPayments}</strong> · Signed contracts: <strong>{signedContracts}</strong></p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
