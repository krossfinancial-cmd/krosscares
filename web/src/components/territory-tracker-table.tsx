"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  applyTerritoryTrackerStatusChange,
  buildTerritoryTrackerSummary,
  formatTerritoryTrackerLabel,
  type TerritoryTrackerEntryRecord,
  type TerritoryTrackerStatusValue,
  TERRITORY_TRACKER_STATUS_VALUES,
  TERRITORY_TRACKER_TIER_VALUES,
} from "@/lib/territory-tracker-meta";

type TerritoryTrackerTableProps = {
  initialEntries: TerritoryTrackerEntryRecord[];
};

const numberFormatter = new Intl.NumberFormat("en-US");
const densityFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function statusBadgeClass(status: TerritoryTrackerStatusValue) {
  if (status === "AVAILABLE") return "bg-emerald-100 text-emerald-700";
  if (status === "RESERVED") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function TerritoryTrackerTable({ initialEntries }: TerritoryTrackerTableProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TerritoryTrackerStatusValue>("ALL");
  const [tierFilter, setTierFilter] = useState<"ALL" | (typeof TERRITORY_TRACKER_TIER_VALUES)[number]>("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (statusFilter !== "ALL" && entry.status !== statusFilter) return false;
      if (tierFilter !== "ALL" && entry.tier !== tierFilter) return false;
      if (!deferredSearch) return true;

      const haystack = [entry.zipCode, entry.city, entry.county, formatTerritoryTrackerLabel(entry.tier)]
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredSearch);
    });
  }, [deferredSearch, entries, statusFilter, tierFilter]);

  const summary = useMemo(() => buildTerritoryTrackerSummary(entries), [entries]);

  async function updateStatus(entryId: string, nextStatus: TerritoryTrackerStatusValue) {
    const currentEntry = entries.find((entry) => entry.id === entryId);
    if (!currentEntry || currentEntry.status === nextStatus) {
      return;
    }

    const previousEntries = entries;
    const optimisticEntry = applyTerritoryTrackerStatusChange(currentEntry, nextStatus);

    setPendingId(entryId);
    setError(null);
    startTransition(() => {
      setEntries((current) => current.map((entry) => (entry.id === entryId ? optimisticEntry : entry)));
    });

    try {
      const response = await fetch(`/api/admin/territory-tracker/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = (await response.json()) as { error?: string; entry?: TerritoryTrackerEntryRecord };
      if (!response.ok || !payload.entry) {
        throw new Error(payload.error || "Could not save tracker status.");
      }

      startTransition(() => {
        setEntries((current) => current.map((entry) => (entry.id === entryId ? payload.entry! : entry)));
      });
    } catch (requestError) {
      startTransition(() => {
        setEntries(previousEntries);
      });
      setError(requestError instanceof Error ? requestError.message : "Could not save tracker status.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Tracked ZIPs</p>
          <p className="mt-2 text-3xl font-bold text-blue-950">{summary.total}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Available</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.byStatus.AVAILABLE}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Reserved</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{summary.byStatus.RESERVED}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Sold</p>
          <p className="mt-2 text-3xl font-bold text-rose-700">{summary.byStatus.SOLD}</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-950">Realtor Territory Tracker</h2>
            <p className="mt-1 max-w-3xl text-sm text-blue-900/70">
              Search ZIPs, filter the list, and update territory status inline. Start dates are stamped automatically when a ZIP
              leaves Available.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-blue-900">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-600">Search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ZIP, city, county"
                className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              />
            </label>
            <label className="text-sm text-blue-900">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-600">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | TerritoryTrackerStatusValue)}
                className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              >
                <option value="ALL">All statuses</option>
                {TERRITORY_TRACKER_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {formatTerritoryTrackerLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-blue-900">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-600">Tier</span>
              <select
                value={tierFilter}
                onChange={(event) => setTierFilter(event.target.value as "ALL" | (typeof TERRITORY_TRACKER_TIER_VALUES)[number])}
                className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              >
                <option value="ALL">All tiers</option>
                {TERRITORY_TRACKER_TIER_VALUES.map((tier) => (
                  <option key={tier} value={tier}>
                    {formatTerritoryTrackerLabel(tier)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-blue-700">
          <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
            {filteredEntries.length} of {entries.length} ZIPs shown
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            Premier {summary.byTier.PREMIER}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            Standard {summary.byTier.STANDARD}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            Rural {summary.byTier.RURAL}
          </span>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-blue-100">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full bg-white text-sm">
              <thead className="sticky top-0 z-10 bg-blue-50 text-xs uppercase tracking-wide text-blue-700">
                <tr>
                  <th className="px-4 py-3 text-left">ZIP</th>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">County</th>
                  <th className="px-4 py-3 text-right">Population</th>
                  <th className="px-4 py-3 text-right">Density</th>
                  <th className="px-4 py-3 text-left">Tier</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Start Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const isPending = pendingId === entry.id;

                  return (
                    <tr key={entry.id} className="border-t border-blue-100 align-top">
                      <td className="px-4 py-3 font-semibold text-blue-950">{entry.zipCode}</td>
                      <td className="px-4 py-3 text-blue-900">{entry.city}</td>
                      <td className="px-4 py-3 text-blue-900">{entry.county}</td>
                      <td className="px-4 py-3 text-right text-blue-900">{numberFormatter.format(entry.population)}</td>
                      <td className="px-4 py-3 text-right text-blue-900">{densityFormatter.format(entry.density)}</td>
                      <td className="px-4 py-3 text-blue-900">{formatTerritoryTrackerLabel(entry.tier)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(entry.status)}`}>
                            {formatTerritoryTrackerLabel(entry.status)}
                          </span>
                          <select
                            value={entry.status}
                            onChange={(event) => updateStatus(entry.id, event.target.value as TerritoryTrackerStatusValue)}
                            disabled={isPending}
                            className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            {TERRITORY_TRACKER_STATUS_VALUES.map((status) => (
                              <option key={status} value={status}>
                                {formatTerritoryTrackerLabel(status)}
                              </option>
                            ))}
                          </select>
                          {isPending ? <span className="text-xs text-blue-600">Saving status...</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-blue-900">
                        {entry.statusDate ? dateFormatter.format(new Date(entry.statusDate)) : <span className="text-blue-400">-</span>}
                      </td>
                    </tr>
                  );
                })}
                {!filteredEntries.length ? (
                  <tr className="border-t border-blue-100">
                    <td colSpan={8} className="px-4 py-8 text-center text-blue-700">
                      No tracker rows match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
