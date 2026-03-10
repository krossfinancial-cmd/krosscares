import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  created?: string;
  error?: string;
}>;

export default async function AdminClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
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
    <div className="space-y-5">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-blue-950">Client Management</h1>
        <p className="mt-1 text-sm text-blue-900/70">Create clients here, then assign them from Inventory Manager.</p>

        {params.created === "1" ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Client created successfully.
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {params.error === "email-already-exists"
              ? "A user with that email already exists."
              : params.error === "missing-required-fields"
                ? "Full name, email, and password are required."
                : params.error === "password-too-short"
                  ? "Password must be at least 8 characters."
                  : "Unable to create client. Please try again."}
          </div>
        ) : null}

        <form action="/api/admin/clients/create" method="post" className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">Full name</span>
            <input
              name="fullName"
              required
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="Jordan Agent"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">Email</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="agent@example.com"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">Temporary password</span>
            <input
              name="password"
              type="text"
              required
              minLength={8}
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="At least 8 characters"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">Vertical</span>
            <select name="vertical" defaultValue="REALTOR" className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950">
              <option value="REALTOR">Realtor</option>
              <option value="DEALER">Dealer</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">Company</span>
            <input
              name="companyName"
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="Company name"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">Phone</span>
            <input
              name="phone"
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="(555) 555-1212"
            />
          </label>
          <div className="md:col-span-2 lg:col-span-3">
            <button type="submit" className="primary-btn text-sm">
              Create Client
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-blue-950">Existing Clients</h2>
        <div className="mt-4 space-y-3">
          {clients.map((client) => {
            const paidPayments = client.payments.filter((p) => p.status === "PAID").length;
            const signedContracts = client.contracts.filter((c) => c.status === "SIGNED").length;
            const territoryZips = [...client.territories]
              .sort((a, b) => a.zipCode.localeCompare(b.zipCode))
              .map((territory) => territory.zipCode);
            return (
              <div key={client.id} className="rounded-xl border border-blue-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-blue-950">{client.user.fullName}</p>
                    <p className="text-sm text-blue-900/70">{client.user.email}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-600">{client.vertical}</p>
                    <p className="mt-2 text-xs text-blue-900/80">
                      Territory ZIPs:{" "}
                      <strong>{territoryZips.length ? territoryZips.join(", ") : "None assigned"}</strong>
                    </p>
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
    </div>
  );
}
