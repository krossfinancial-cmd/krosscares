import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RealtorRoutingPage() {
  const user = await requireUser("REALTOR");
  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: { leadRoutes: true },
  });
  if (!client) return null;

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-blue-950">Lead Routing Settings</h1>
        <form action="/api/routes/update" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="clientId" value={client.id} />
          <label>
            <span className="mb-1 block text-sm font-semibold text-blue-900">Routing Email</span>
            <input
              name="leadRoutingEmail"
              defaultValue={client.leadRoutingEmail || ""}
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
              required
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-blue-900">Routing Phone</span>
            <input
              name="leadRoutingPhone"
              defaultValue={client.leadRoutingPhone || ""}
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
              required
            />
          </label>
          <button className="primary-btn md:col-span-2" type="submit">
            Save Routing
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-blue-950">Active Routes</h2>
        <div className="mt-3 space-y-2">
          {client.leadRoutes.map((route) => (
            <div key={route.id} className="rounded-xl border border-blue-100 p-3 text-sm text-blue-900">
              <p className="font-semibold text-blue-950">ZIP {route.zipCode}</p>
              <p>Email: {route.destinationEmail}</p>
              <p>Phone: {route.destinationPhone}</p>
            </div>
          ))}
          {!client.leadRoutes.length && <p className="text-sm text-blue-900/70">No active routes yet.</p>}
        </div>
      </div>
    </div>
  );
}
