import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RealtorLeadsPage() {
  const user = await requireUser("REALTOR");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return null;

  const leads = await prisma.lead.findMany({
    where: { clientId: client.id },
    include: { zip: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-blue-950">Lead Activity</h1>
      <table className="mt-4 w-full text-sm">
        <thead className="text-xs uppercase text-blue-700">
          <tr>
            <th className="py-2 text-left">Name</th>
            <th className="py-2 text-left">ZIP</th>
            <th className="py-2 text-left">Contact</th>
            <th className="py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-blue-100">
              <td className="py-3 font-medium text-blue-950">{lead.firstName} {lead.lastName}</td>
              <td className="py-3 text-blue-900">{lead.zip.zipCode}</td>
              <td className="py-3 text-blue-900">{lead.email}</td>
              <td className="py-3">
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{lead.status}</span>
              </td>
            </tr>
          ))}
          {!leads.length && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-blue-700">
                No leads yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
