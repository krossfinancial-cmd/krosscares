import type { TerritoryTrackerStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { TERRITORY_TRACKER_STATUS_VALUES } from "@/lib/territory-tracker-meta";
import { getCurrentUser } from "@/lib/auth";
import { isDatabaseUnavailableError } from "@/lib/database-errors";
import { prisma } from "@/lib/prisma";

type Params = Promise<{
  entryId: string;
}>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;
    const body = (await request.json()) as { status?: string };
    const nextStatus = String(body.status || "").toUpperCase().trim();

    if (!TERRITORY_TRACKER_STATUS_VALUES.includes(nextStatus as (typeof TERRITORY_TRACKER_STATUS_VALUES)[number])) {
      return NextResponse.json({ error: "Invalid tracker status." }, { status: 400 });
    }

    const safeStatus = nextStatus as TerritoryTrackerStatus;

    const existingEntry = await prisma.territoryTrackerEntry.findUnique({
      where: { id: entryId },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Tracker entry not found." }, { status: 404 });
    }

    const now = new Date();
    let statusDate = existingEntry.statusDate;

    if (existingEntry.status === "AVAILABLE" && safeStatus !== "AVAILABLE") {
      statusDate = now;
    } else if (safeStatus === "AVAILABLE") {
      statusDate = null;
    }

    const updatedEntry = await prisma.territoryTrackerEntry.update({
      where: { id: entryId },
      data: {
        status: safeStatus,
        statusDate,
      },
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/territory-tracker");

    return NextResponse.json({
      entry: {
        id: updatedEntry.id,
        zipCode: updatedEntry.zipCode,
        city: updatedEntry.city,
        county: updatedEntry.county,
        population: updatedEntry.population,
        density: updatedEntry.density,
        tier: updatedEntry.tier,
        status: updatedEntry.status,
        statusDate: updatedEntry.statusDate ? updatedEntry.statusDate.toISOString() : null,
      },
    });
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }

    console.error("Territory tracker update failed because the database is unavailable.", error);

    return NextResponse.json(
      {
        error: "Territory tracker is temporarily unavailable while the database reconnects or pending schema updates finish.",
      },
      { status: 503 },
    );
  }
}
