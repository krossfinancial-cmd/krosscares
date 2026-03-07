import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

type Params = Promise<{ zipId: string }>;

export default async function CheckoutPage({ params }: { params: Params }) {
  const { zipId } = await params;
  const user = await requireUser("REALTOR");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return null;

  const zip = await prisma.zipInventory.findUnique({ where: { id: zipId } });
  if (!zip || zip.assignedClientId !== client.id) {
    redirect("/dashboard/realtor/territories?error=zip-not-assigned");
  }

  const payment = await prisma.payment.findFirst({
    where: { zipId, clientId: client.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-blue-950">Checkout: ZIP {zip.zipCode}</h1>
      <p className="mt-2 text-sm text-blue-900/70">
        This local environment uses mock payment completion. Stripe webhooks are wired for later phase cutover.
      </p>
      <div className="mt-5 space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <p><strong>City:</strong> {zip.city}, {zip.state}</p>
        <p><strong>Tier:</strong> {zip.tier.replace("_", " ")}</p>
        <p><strong>Annual price:</strong> {formatCurrency(zip.annualPriceCents)}</p>
        <p><strong>Current status:</strong> {zip.status}</p>
        <p><strong>Payment status:</strong> {payment?.status || "PENDING"}</p>
      </div>

      <form action="/api/checkout/mock" method="post" className="mt-5">
        <input type="hidden" name="zipId" value={zip.id} />
        <button className="primary-btn" type="submit">
          Complete Mock Payment
        </button>
      </form>

      <div className="mt-4">
        <Link href={`/dashboard/realtor/contract/${zip.id}`} className="secondary-btn text-sm">
          Continue to Contract Status
        </Link>
      </div>
    </div>
  );
}
