export const TERRITORY_TRACKER_STATUS_VALUES = ["AVAILABLE", "RESERVED", "SOLD"] as const;
export const TERRITORY_TRACKER_TIER_VALUES = ["PREMIER", "STANDARD", "RURAL"] as const;

export type TerritoryTrackerStatusValue = (typeof TERRITORY_TRACKER_STATUS_VALUES)[number];
export type TerritoryTrackerTierValue = (typeof TERRITORY_TRACKER_TIER_VALUES)[number];

export type TerritoryTrackerEntryRecord = {
  id: string;
  zipCode: string;
  city: string;
  county: string;
  population: number;
  density: number;
  tier: TerritoryTrackerTierValue;
  status: TerritoryTrackerStatusValue;
  statusDate: string | null;
};

export type TerritoryTrackerSummary = {
  total: number;
  byStatus: Record<TerritoryTrackerStatusValue, number>;
  byTier: Record<TerritoryTrackerTierValue, number>;
};

export const TERRITORY_TRACKER_METHODOLOGY = [
  {
    label: "Data scope",
    value: "North Carolina household ZIPs only (ZCTA rows, military excluded).",
  },
  {
    label: "Premier",
    value: "ZIP appears in the public NC Top 50 median-household-income ranking.",
  },
  {
    label: "Rural",
    value: "Population below 5,000 or density below 60 residents per square mile.",
  },
  {
    label: "Standard",
    value: "All remaining household ZIPs.",
  },
  {
    label: "Status automation",
    value: "When a ZIP leaves Available for Sold or Reserved, the current date becomes the start date automatically.",
  },
  {
    label: "Sources",
    value: "US ZIP codes dataset and NC median-household-income ranking.",
  },
];

export const TERRITORY_TRACKER_REFERENCE_SUMMARY: TerritoryTrackerSummary = {
  total: 808,
  byStatus: {
    AVAILABLE: 808,
    RESERVED: 0,
    SOLD: 0,
  },
  byTier: {
    PREMIER: 49,
    STANDARD: 237,
    RURAL: 522,
  },
};

export function formatTerritoryTrackerLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function buildTerritoryTrackerSummary(entries: Array<Pick<TerritoryTrackerEntryRecord, "status" | "tier">>) {
  const summary: TerritoryTrackerSummary = {
    total: entries.length,
    byStatus: {
      AVAILABLE: 0,
      RESERVED: 0,
      SOLD: 0,
    },
    byTier: {
      PREMIER: 0,
      STANDARD: 0,
      RURAL: 0,
    },
  };

  for (const entry of entries) {
    summary.byStatus[entry.status] += 1;
    summary.byTier[entry.tier] += 1;
  }

  return summary;
}

export function applyTerritoryTrackerStatusChange(
  entry: TerritoryTrackerEntryRecord,
  nextStatus: TerritoryTrackerStatusValue,
  nowIso = new Date().toISOString(),
) {
  if (entry.status === nextStatus) {
    return entry;
  }

  if (entry.status === "AVAILABLE" && nextStatus !== "AVAILABLE") {
    return {
      ...entry,
      status: nextStatus,
      statusDate: nowIso,
    };
  }

  if (nextStatus === "AVAILABLE") {
    return {
      ...entry,
      status: nextStatus,
      statusDate: null,
    };
  }

  return {
    ...entry,
    status: nextStatus,
  };
}
