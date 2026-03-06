import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

export default async function RealtorBillingPage() {
  const user = await requireUser("REALTOR");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return null;

  const payments = await prisma.payment.findMany({
    where: { clientId: client.id },
    include: { zip: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-blue-950">Billing & Renewals</h1>
      <p className="mt-2 text-sm text-blue-900/70">Stripe integration is staged. Local flow currently uses mock payment completion.</p>
      <table className="mt-4 w-full text-sm">
        <thead className="text-xs uppercase text-blue-700">
          <tr>
            <th className="py-2 text-left">ZIP</th>
            <th className="py-2 text-left">Amount</th>
            <th className="py-2 text-left">Status</th>
            <th className="py-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-t border-blue-100">
              <td className="py-3 font-medium text-blue-950">{payment.zip.zipCode}</td>
              <td className="py-3 text-blue-900">{formatCurrency(payment.amountCents)}</td>
              <td className="py-3 text-blue-900">{payment.status}</td>
              <td className="py-3 text-blue-900">{payment.createdAt.toDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
