import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ zipId: string }>;

export default async function OnboardingPage({ params }: { params: Params }) {
  const { zipId } = await params;
  const user = await requireUser("DEALER");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return null;

  const zip = await prisma.zipInventory.findUnique({ where: { id: zipId } });
  if (!zip || zip.assignedClientId !== client.id) notFound();

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-blue-950">Onboarding: ZIP {zip.zipCode}</h1>
      <p className="mt-2 text-sm text-blue-900/70">Submit required profile details and assets to activate territory routing.</p>

      <form action="/api/onboarding/submit" method="post" encType="multipart/form-data" className="mt-6 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="zipId" value={zip.id} />
        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Full Name</span>
          <input
            name="fullName"
            defaultValue={user.fullName}
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            required
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Company Name</span>
          <input
            name="companyName"
            defaultValue={user.companyName || ""}
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            required
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">License Number</span>
          <input
            name="licenseNumber"
            defaultValue={client.licenseNumber || ""}
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            required
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Website</span>
          <input
            name="website"
            defaultValue={client.website || ""}
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Lead Routing Email</span>
          <input
            name="leadRoutingEmail"
            type="email"
            defaultValue={client.leadRoutingEmail || user.email}
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            required
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Lead Routing Phone</span>
          <input
            name="leadRoutingPhone"
            defaultValue={client.leadRoutingPhone || user.phone || ""}
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            required
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Headshot (jpg/png)</span>
          <input name="headshot" type="file" accept=".jpg,.jpeg,.png" className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm" required />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Company Logo (png/svg/jpg)</span>
          <input name="logo" type="file" accept=".png,.svg,.jpg,.jpeg" className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm" required />
        </label>

        <button className="primary-btn md:col-span-2" type="submit">
          Submit Onboarding
        </button>
      </form>
    </div>
  );
}
