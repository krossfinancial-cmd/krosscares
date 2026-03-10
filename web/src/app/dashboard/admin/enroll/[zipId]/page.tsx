import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ zipId: string }>;
type SearchParams = Promise<{ error?: string }>;

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function AdminEnrollPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireUser("ADMIN");
  const { zipId } = await params;
  const query = await searchParams;

  const zip = await prisma.zipInventory.findUnique({ where: { id: zipId } });
  if (!zip) {
    redirect("/dashboard/admin/inventory-manager?error=zip-not-found");
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-blue-950">Enroll New {zip.vertical === "REALTOR" ? "Realtor" : "Dealer"}</h1>
          <p className="mt-1 text-sm text-blue-900/70">
            ZIP {zip.zipCode} · {zip.city}, {zip.state} ({zip.vertical})
          </p>
        </div>
        <Link href="/dashboard/admin/inventory-manager" className="secondary-btn text-sm">
          Back to Inventory Manager
        </Link>
      </div>

      {query.error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {safeDecode(query.error)}
        </div>
      ) : null}

      <form action="/api/admin/enroll" method="post" encType="multipart/form-data" className="mt-6 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="zipId" value={zip.id} />

        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Full Name</span>
          <input
            name="fullName"
            required
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            placeholder="Jordan Agent"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Company Name</span>
          <input
            name="companyName"
            required
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            placeholder="Company name"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            placeholder="agent@company.com"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Phone</span>
          <input
            name="phone"
            required
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            placeholder="(555) 555-1212"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">License Number</span>
          <input
            name="licenseNumber"
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Website</span>
          <input
            name="website"
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Lead Routing Email</span>
          <input
            name="leadRoutingEmail"
            type="email"
            required
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            placeholder="leads@company.com"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Lead Routing Phone</span>
          <input
            name="leadRoutingPhone"
            required
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
            placeholder="(555) 555-1212"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Headshot (optional)</span>
          <input name="headshot" type="file" accept=".jpg,.jpeg,.png" className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm" />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-blue-900">Company Logo (optional)</span>
          <input name="logo" type="file" accept=".png,.svg,.jpg,.jpeg" className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm" />
        </label>

        <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <input type="checkbox" name="paymentCollected" required />
          Payment collected (required before assignment and invite email)
        </label>

        <button className="primary-btn md:col-span-2" type="submit">
          Complete Enrollment, Assign ZIP, and Send Password Setup Email
        </button>
      </form>
    </div>
  );
}
