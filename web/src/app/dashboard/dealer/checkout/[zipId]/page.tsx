import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ zipId: string }>;

export default async function CheckoutPage({ params }: { params: Params }) {
  const { zipId } = await params;
  const now = new Date();
  const user = await requireUser("DEALER");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return null;

  const zip = await prisma.zipInventory.findUnique({ where: { id: zipId } });
  if (!zip || zip.assignedClientId !== client.id) {
    redirect("/dashboard/dealer/territories?error=zip-not-assigned");
  }

  const payment = await prisma.payment.findFirst({
    where: { zipId, clientId: client.id },
    orderBy: { createdAt: "desc" },
  });
  const hasPaid = payment?.status === "PAID";
  const reservationExpiresAt = zip.reservationExpiresAt;
  const reservationExpired =
    zip.status === "RESERVED" && !!reservationExpiresAt && reservationExpiresAt <= now;

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-blue-950">Checkout: ZIP {zip.zipCode}</h1>
      {hasPaid ? (
        <p className="mt-5 text-sm font-semibold text-emerald-700">Payment already completed for this ZIP.</p>
      ) : reservationExpired ? (
        <p className="mt-5 text-sm font-semibold text-rose-700">
          Reservation expired. Go back to marketplace and reclaim if still available.
        </p>
      ) : (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Secure Payment Required</p>
          <p className="mt-1 text-xs text-amber-700">
            Please use the Stripe checkout link provided in your email or contact support to finalize your territory purchase.
          </p>
        </div>
      )}

      <div className="mt-4">
        <Link href={`/dashboard/dealer/contract/${zip.id}`} className="secondary-btn text-sm">
          Continue to Contract Status
        </Link>
      </div>
    </div>
  );
}
