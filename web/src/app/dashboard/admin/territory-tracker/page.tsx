import Link from "next/link";
import { TerritoryTrackerTable } from "@/components/territory-tracker-table";
import {
  formatTerritoryTrackerLabel,
  TERRITORY_TRACKER_METHODOLOGY,
  TERRITORY_TRACKER_REFERENCE_SUMMARY,
} from "@/lib/territory-tracker-meta";
import { getTerritoryTrackerEntries } from "@/lib/territory-tracker";

export default async function AdminTerritoryTrackerPage() {
  const entries = await getTerritoryTrackerEntries();

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Admin Tool</p>
            <h1 className="mt-2 text-2xl font-bold text-blue-950">Territory Tracker</h1>
            <p className="mt-2 max-w-3xl text-sm text-blue-900/70">
              North Carolina realtor ZIP territory tracking with inline status management, automated start dates, and methodology
              reference details from the source workbook.
            </p>
          </div>
          <Link href="/dashboard/admin" className="secondary-btn w-fit text-sm">
            Back to Overview
          </Link>
        </div>
      </div>

      <TerritoryTrackerTable initialEntries={entries} />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-blue-950">Methodology</h2>
          <div className="mt-4 space-y-3">
            {TERRITORY_TRACKER_METHODOLOGY.map((item) => (
              <div key={item.label} className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{item.label}</p>
                <p className="mt-1 text-sm text-blue-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-blue-950">Reference Summary</h2>
          <p className="mt-1 text-sm text-blue-900/70">Baseline counts from the imported workbook before any admin edits.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Total ZIPs</p>
              <p className="mt-2 text-3xl font-bold text-blue-950">{TERRITORY_TRACKER_REFERENCE_SUMMARY.total}</p>
            </div>
            {Object.entries(TERRITORY_TRACKER_REFERENCE_SUMMARY.byTier).map(([tier, count]) => (
              <div key={tier} className="rounded-2xl border border-blue-100 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{formatTerritoryTrackerLabel(tier)}</p>
                <p className="mt-2 text-2xl font-bold text-blue-950">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
