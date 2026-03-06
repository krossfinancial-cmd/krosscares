import { Search } from "lucide-react";
import { ZipActionButton } from "@/components/zip-action-button";
import { formatCurrency, zipStatusColor } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { getMarketplaceZips } from "@/lib/queries";

type SearchParams = Promise<{
  search?: string;
  status?: string;
  tier?: string;
}>;

export default async function MarketplacePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const zips = await getMarketplaceZips(params);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-blue-950">ZIP Territory Marketplace</h1>
        <p className="mt-2 text-sm text-blue-900/70">One active owner per ZIP. Once sold, it moves to waitlist mode.</p>
        <a href="/marketplace/scarcity" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900">
          View scarcity map
        </a>
        <form className="mt-5 grid gap-3 md:grid-cols-4">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">Search ZIP / City</span>
            <div className="flex items-center rounded-xl border border-blue-200 bg-white px-3 py-2">
              <Search size={16} className="text-blue-500" />
              <input
                name="search"
                defaultValue={params.search || ""}
                className="ml-2 w-full bg-transparent text-sm text-blue-950"
                placeholder="27519 or Cary"
              />
            </div>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">Status</span>
            <select name="status" defaultValue={params.status || "ALL"} className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950">
              <option value="ALL">All</option>
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="SOLD">Sold</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">Tier</span>
            <select name="tier" defaultValue={params.tier || "ALL"} className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950">
              <option value="ALL">All</option>
              <option value="STANDARD">Standard</option>
              <option value="HIGH_DEMAND">High Demand</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </label>
          <button type="submit" className="primary-btn md:col-span-4">
            Apply Filters
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-blue-50 text-xs uppercase text-blue-700">
            <tr>
              <th className="px-4 py-3">ZIP</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Annual Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {zips.map((zip) => (
              <tr key={zip.id} className="border-t border-blue-100 hover:bg-blue-50/60">
                <td className="px-4 py-3 font-semibold text-blue-950">{zip.zipCode}</td>
                <td className="px-4 py-3 text-blue-900">{zip.city}, {zip.state}</td>
                <td className="px-4 py-3 text-blue-900">{zip.tier.replace("_", " ")}</td>
                <td className="px-4 py-3 font-semibold text-blue-950">{formatCurrency(zip.annualPriceCents)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${zipStatusColor(zip.status)}`}>
                    {zip.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {user?.role === "REALTOR" ? (
                    <ZipActionButton zipId={zip.id} zipCode={zip.zipCode} status={zip.status} />
                  ) : (
                    <a href="/login" className="secondary-btn text-xs">
                      Sign in to claim
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {!zips.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-blue-700">
                  No ZIPs match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
