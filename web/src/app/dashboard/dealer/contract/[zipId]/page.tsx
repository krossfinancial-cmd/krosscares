import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ zipId: string }>;

function stepDone(done: boolean) {
  return done ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700";
}

export default async function ContractPage({ params }: { params: Params }) {
  const { zipId } = await params;
  const user = await requireUser("DEALER");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return null;

  const zip = await prisma.zipInventory.findUnique({ where: { id: zipId } });
  if (!zip || zip.assignedClientId !== client.id) notFound();

  const [payment, contract, onboarding] = await Promise.all([
    prisma.payment.findFirst({ where: { clientId: client.id, zipId }, orderBy: { createdAt: "desc" } }),
    prisma.contract.findFirst({ where: { clientId: client.id, zipId }, orderBy: { createdAt: "desc" } }),
    prisma.onboardingForm.findFirst({ where: { clientId: client.id, zipId } }),
  ]);

  const paid = payment?.status === "PAID";
  const sent = contract?.status === "SENT" || contract?.status === "SIGNED";
  const signed = contract?.status === "SIGNED";
  const onboarded = onboarding?.status === "COMPLETED";
  const active = zip.status === "SOLD";

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-blue-950">Agreement Workflow: ZIP {zip.zipCode}</h1>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${stepDone(paid)}`}>Payment Complete</div>
          <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${stepDone(sent)}`}>Agreement Sent</div>
          <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${stepDone(signed)}`}>Agreement Signed</div>
          <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${stepDone(onboarded)}`}>Onboarding</div>
          <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${stepDone(active)}`}>ZIP Activated</div>
        </div>

        {!signed && (
          <form action="/api/contracts/sign" method="post" className="mt-5">
            <input type="hidden" name="zipId" value={zipId} />
            <button className="primary-btn" type="submit">
              Sign Agreement
            </button>
          </form>
        )}
      </div>

      <div className="flex gap-3">
        <Link href={`/dashboard/dealer/onboarding/${zipId}`} className="secondary-btn text-sm">
          Continue to Onboarding
        </Link>
        <Link href="/dashboard/dealer" className="secondary-btn text-sm">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
