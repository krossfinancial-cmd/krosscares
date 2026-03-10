import type { TerritoryTrackerStatus, TerritoryTrackerTier } from "@prisma/client";
import territoryTrackerSeedData from "@/data/territory-tracker-realtors.json";
import { prisma } from "@/lib/prisma";
import {
  buildTerritoryTrackerSummary,
  type TerritoryTrackerEntryRecord,
  type TerritoryTrackerStatusValue,
  type TerritoryTrackerTierValue,
} from "@/lib/territory-tracker-meta";

type TerritoryTrackerSeedRow = {
  zipCode: string;
  city: string;
  county: string;
  population: number;
  density: number;
  tier: TerritoryTrackerTierValue;
  status: TerritoryTrackerStatusValue;
  statusDate: string | null;
};

const normalizedSeedData = territoryTrackerSeedData as TerritoryTrackerSeedRow[];

let seedPromise: Promise<void> | null = null;

export async function ensureTerritoryTrackerSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existingCount = await prisma.territoryTrackerEntry.count();
      if (existingCount >= normalizedSeedData.length) return;

      await prisma.territoryTrackerEntry.createMany({
        data: normalizedSeedData.map((entry) => ({
          zipCode: entry.zipCode,
          city: entry.city,
          county: entry.county,
          population: entry.population,
          density: entry.density,
          tier: entry.tier as TerritoryTrackerTier,
          status: entry.status as TerritoryTrackerStatus,
          statusDate: entry.statusDate ? new Date(entry.statusDate) : null,
        })),
        skipDuplicates: true,
      });
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }

  await seedPromise;
}

export async function getTerritoryTrackerEntries() {
  await ensureTerritoryTrackerSeeded();

  const entries = await prisma.territoryTrackerEntry.findMany({
    orderBy: [{ zipCode: "asc" }],
  });

  return entries.map<TerritoryTrackerEntryRecord>((entry) => ({
    id: entry.id,
    zipCode: entry.zipCode,
    city: entry.city,
    county: entry.county,
    population: entry.population,
    density: entry.density,
    tier: entry.tier,
    status: entry.status,
    statusDate: entry.statusDate ? entry.statusDate.toISOString() : null,
  }));
}

export async function getTerritoryTrackerSummary() {
  await ensureTerritoryTrackerSeeded();

  const entries = await prisma.territoryTrackerEntry.findMany({
    select: {
      status: true,
      tier: true,
    },
  });

  return buildTerritoryTrackerSummary(entries);
}
