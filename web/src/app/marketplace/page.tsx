import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import type { ZipStatus } from "@prisma/client";
import { ZipActionButton } from "@/components/zip-action-button";
import { isDatabaseUnavailableError } from "@/lib/database-errors";
import { formatCurrency, zipStatusColor } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { getMarketplaceZips } from "@/lib/queries";

type MarketplaceSortField = "zip" | "city" | "tier" | "vertical" | "price" | "status";
type MarketplaceSortDirection = "asc" | "desc";

type SearchParams = Promise<{
  search?: string;
  status?: string;
  tier?: string;
  vertical?: string;
  sort?: string;
  direction?: string;
}>;

const SORT_FIELDS = new Set<MarketplaceSortField>(["zip", "city", "tier", "vertical", "price", "status"]);
const SORT_DIRECTIONS = new Set<MarketplaceSortDirection>(["asc", "desc"]);
const TIER_ORDER: Record<string, number> = {
  STANDARD: 0,
  HIGH_DEMAND: 1,
  PREMIUM: 2,
};
const STATUS_ORDER: Record<string, number> = {
  AVAILABLE: 0,
  RESERVED: 1,
  SOLD: 2,
  BLOCKED: 3,
};

function safeSortField(value: string | undefined): MarketplaceSortField | null {
  return value && SORT_FIELDS.has(value as MarketplaceSortField) ? (value as MarketplaceSortField) : null;
}

function safeSortDirection(value: string | undefined): MarketplaceSortDirection {
  return value && SORT_DIRECTIONS.has(value as MarketplaceSortDirection) ? (value as MarketplaceSortDirection) : "asc";
}

function displayZipStatus(zip: { status: ZipStatus; reservationExpiresAt: Date | null }, now: Date): ZipStatus {
  return zip.status === "RESERVED" && zip.reservationExpiresAt && zip.reservationExpiresAt <= now ? "AVAILABLE" : zip.status;
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function isExactZipSearch(value: string | undefined) {
  return /^\d{5}$/.test(value?.trim() || "");
}

function buildSortHref(
  params: Awaited<SearchParams>,
  field: MarketplaceSortField,
  lockedVertical: string | undefined,
  activeField: MarketplaceSortField | null,
  activeDirection: MarketplaceSortDirection,
) {
  const nextDirection: MarketplaceSortDirection = activeField === field && activeDirection === "asc" ? "desc" : "asc";
  const nextParams = new URLSearchParams();

  if (params.search) nextParams.set("search", params.search);
  if (params.status) nextParams.set("status", params.status);
  if (params.tier) nextParams.set("tier", params.tier);
  if (lockedVertical) {
    nextParams.set("vertical", lockedVertical);
  } else if (params.vertical) {
    nextParams.set("vertical", params.vertical);
  }

  nextParams.set("sort", field);
  nextParams.set("direction", nextDirection);

  const query = nextParams.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

function SortHeader({
  label,
  field,
  params,
  lockedVertical,
  activeField,
  activeDirection,
  align = "left",
}: {
  label: string;
  field: MarketplaceSortField;
  params: Awaited<SearchParams>;
  lockedVertical: string | undefined;
  activeField: MarketplaceSortField | null;
  activeDirection: MarketplaceSortDirection;
  align?: "left" | "right";
}) {
  const isActive = activeField === field;
  const href = buildSortHref(params, field, lockedVertical, activeField, activeDirection);
  const iconClassName = isActive ? "text-blue-700" : "text-blue-400";

  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end" : "justify-start"} hover:text-blue-900`}
      >
        <span>{label}</span>
        {isActive ? (
          activeDirection === "asc" ? (
            <ArrowUp size={14} className={iconClassName} />
          ) : (
            <ArrowDown size={14} className={iconClassName} />
          )
        ) : (
          <ArrowUpDown size={14} className={iconClassName} />
        )}
      </Link>
    </th>
  );
}

export default async function MarketplacePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const now = new Date();
  const rawSearch = params.search?.trim() || "";
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let inventoryUnavailable = false;

  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }

    inventoryUnavailable = true;
    console.error("Marketplace auth lookup failed because the database is unavailable.", error);
  }

  const lockedVertical = user?.role === "DEALER" ? "DEALER" : user?.role === "REALTOR" ? "REALTOR" : undefined;
  const effectiveVertical = lockedVertical ?? params.vertical ?? "ALL";
  const guestZipSearch = !user && isExactZipSearch(rawSearch);
  const shouldLoadZips = !!user || guestZipSearch;
  const sortField = safeSortField(params.sort);
  const sortDirection = safeSortDirection(params.direction);
  let zips: Awaited<ReturnType<typeof getMarketplaceZips>> = [];

  if (shouldLoadZips) {
    try {
      zips = await getMarketplaceZips({
        ...params,
        search: rawSearch,
        vertical: effectiveVertical,
      });
    } catch (error) {
      if (!isDatabaseUnavailableError(error)) {
        throw error;
      }

      inventoryUnavailable = true;
      console.error("Marketplace inventory query failed because the database is unavailable.", error);
    }
  }

  const sortedZips = [...zips].sort((left, right) => {
    if (!sortField) return 0;

    let result = 0;

    switch (sortField) {
      case "zip":
        result = compareText(left.zipCode, right.zipCode);
        break;
      case "city":
        result = compareText(left.city, right.city);
        break;
      case "tier":
        result = (TIER_ORDER[left.tier] ?? 0) - (TIER_ORDER[right.tier] ?? 0);
        break;
      case "vertical":
        result = compareText(left.vertical, right.vertical);
        break;
      case "price":
        result = left.annualPriceCents - right.annualPriceCents;
        break;
      case "status":
        result = (STATUS_ORDER[displayZipStatus(left, now)] ?? 99) - (STATUS_ORDER[displayZipStatus(right, now)] ?? 99);
        break;
    }

    if (result === 0) {
      result = compareText(left.zipCode, right.zipCode);
    }

    return sortDirection === "desc" ? -result : result;
  });

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-blue-950">ZIP Territory Marketplace</h1>
        <p className="mt-2 text-sm text-blue-900/70">One active owner per ZIP. Once sold, it moves to waitlist mode.</p>
        {inventoryUnavailable ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Marketplace inventory is temporarily unavailable while the database reconnects. Please try again shortly.
          </div>
        ) : null}
        {lockedVertical ? (
          <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            Showing {lockedVertical.toLowerCase()} territories for your account
          </p>
        ) : !user ? (
          <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            Search a specific ZIP to check availability. Sign in to browse the full marketplace.
          </p>
        ) : null}
        <a href="/marketplace/scarcity" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900">
          View scarcity map
        </a>
        <form className="mt-5 grid gap-3 md:grid-cols-4">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">
              {user ? "Search ZIP / City" : "Search ZIP"}
            </span>
            <div className="flex items-center rounded-xl border border-blue-200 bg-white px-3 py-2">
              <Search size={16} className="text-blue-500" />
              <input
                name="search"
                defaultValue={rawSearch}
                className="ml-2 w-full bg-transparent text-sm text-blue-950"
                placeholder={user ? "27519 or Cary" : "Enter a 5-digit ZIP"}
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
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-blue-700">Vertical</span>
            {lockedVertical ? (
              <>
                <input type="hidden" name="vertical" value={lockedVertical} />
                <select
                  value={lockedVertical}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
                >
                  <option value={lockedVertical}>{lockedVertical === "REALTOR" ? "Realtor" : "Dealer"}</option>
                </select>
              </>
            ) : (
              <select name="vertical" defaultValue={params.vertical || "ALL"} className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950">
                <option value="ALL">All</option>
                <option value="REALTOR">Realtor</option>
                <option value="DEALER">Dealer</option>
              </select>
            )}
          </label>
          <button type="submit" className="primary-btn md:col-span-1">
            Apply Filters
          </button>
        </form>
      </div>

      {shouldLoadZips ? (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-blue-50 text-xs uppercase text-blue-700">
              <tr>
                <SortHeader label="ZIP" field="zip" params={params} lockedVertical={lockedVertical} activeField={sortField} activeDirection={sortDirection} />
                <SortHeader label="City" field="city" params={params} lockedVertical={lockedVertical} activeField={sortField} activeDirection={sortDirection} />
                <SortHeader label="Tier" field="tier" params={params} lockedVertical={lockedVertical} activeField={sortField} activeDirection={sortDirection} />
                <SortHeader label="Vertical" field="vertical" params={params} lockedVertical={lockedVertical} activeField={sortField} activeDirection={sortDirection} />
                <SortHeader label="Annual Price" field="price" params={params} lockedVertical={lockedVertical} activeField={sortField} activeDirection={sortDirection} />
                <SortHeader label="Status" field="status" params={params} lockedVertical={lockedVertical} activeField={sortField} activeDirection={sortDirection} />
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedZips.map((zip) => {
                const displayStatus = displayZipStatus(zip, now);

                return (
                  <tr key={zip.id} className="border-t border-blue-100 hover:bg-blue-50/60">
                    <td className="px-4 py-3 font-semibold text-blue-950">{zip.zipCode}</td>
                    <td className="px-4 py-3 text-blue-900">{zip.city}, {zip.state}</td>
                    <td className="px-4 py-3 text-blue-900">{zip.tier.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-blue-900">{zip.vertical}</td>
                    <td className="px-4 py-3 font-semibold text-blue-950">{formatCurrency(zip.annualPriceCents)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${zipStatusColor(displayStatus)}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!user ? (
                        <a href="/login" className="secondary-btn text-xs">
                          Sign in to claim
                        </a>
                      ) : user.role === "ADMIN" ? (
                        <a href="/dashboard/admin/inventory-manager" className="secondary-btn text-xs">
                          Assign in Admin
                        </a>
                      ) : user.role !== zip.vertical ? (
                        <span className="text-xs text-blue-700/70">Not your vertical</span>
                      ) : (
                        <ZipActionButton
                          zipId={zip.id}
                          zipCode={zip.zipCode}
                          vertical={zip.vertical}
                          dashboardPath={user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor"}
                          status={displayStatus}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              {!zips.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-blue-700">
                    {inventoryUnavailable ? "Marketplace inventory is temporarily unavailable." : "No ZIPs match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-blue-700">
          {rawSearch ? "Enter a full 5-digit ZIP code to search availability." : "Enter a ZIP code above to check one territory, or sign in to browse the full marketplace."}
        </div>
      )}
    </div>
  );
}
