import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isProduction } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { ReservationCountdown } from "@/components/reservation-countdown";

type Params = Promise<{ zipId: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function CheckoutPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { zipId } = await params;
  const query = await searchParams;
  const now = new Date();
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
  const hasPaid = payment?.status === "PAID";
  const reservationExpiresAt = zip.reservationExpiresAt;
  const reservationExpired =
    zip.status === "RESERVED" && !!reservationExpiresAt && reservationExpiresAt <= now;

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-blue-950">Checkout: ZIP {zip.zipCode}</h1>
      <p className="mt-2 text-sm text-blue-900/70">
        Payments are confirmed in Stripe and synced into your account after the Supabase webhook is processed.
      </p>
      {query.error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {decodeURIComponent(query.error)}
        </div>
      ) : null}
      {zip.status === "RESERVED" && reservationExpiresAt && !hasPaid ? (
        <div className="mt-4">
          <ReservationCountdown expiresAtIso={reservationExpiresAt.toISOString()} />
        </div>
      ) : null}
      <div className="mt-5 space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <p><strong>City:</strong> {zip.city}, {zip.state}</p>
        <p><strong>Tier:</strong> {zip.tier.replace("_", " ")}</p>
        <p><strong>Annual price:</strong> {formatCurrency(zip.annualPriceCents)}</p>
        <p><strong>Current status:</strong> {zip.status}</p>
        <p><strong>Payment status:</strong> {payment?.status || "PENDING"}</p>
      </div>

      {hasPaid ? (
        <p className="mt-5 text-sm font-semibold text-emerald-700">Payment already completed for this ZIP.</p>
      ) : reservationExpired ? (
        <p className="mt-5 text-sm font-semibold text-rose-700">
          Reservation expired. Go back to marketplace and reclaim if still available.
        </p>
      ) : isProduction ? (
        <p className="mt-5 text-sm font-semibold text-blue-900">
          Complete payment in Stripe. This page will reflect the paid status automatically after the webhook is received.
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
        <Link href={`/dashboard/realtor/contract/${zip.id}`} className="secondary-btn text-sm">
          Continue to Contract Status
        </Link>
      </div>
    </div>
  );
}
