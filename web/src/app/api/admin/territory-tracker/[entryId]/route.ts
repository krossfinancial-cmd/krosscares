import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { TERRITORY_TRACKER_STATUS_VALUES } from "@/lib/territory-tracker-meta";
import { getCurrentUser } from "@/lib/auth";
import { callBackendApi } from "@/lib/backend-api";

type Params = Promise<{
  entryId: string;
}>;

type TrackerEntryResponse = {
  id: string;
  zipCode: string;
  city: string;
  county: string;
  population: number;
  density: number;
  tier: string;
  status: string;
  statusDate: string | null;
  createdAt: string;
  updatedAt: string;
};

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

    const result = await callBackendApi<{ ok: boolean; entry: TrackerEntryResponse }>("admin.tracker.updateStatus", {
      entryId,
      status: nextStatus,
      actorUserId: user.id,
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/territory-tracker");

    return NextResponse.json({
      entry: result.entry,
    });
  } catch (error) {
    console.error("Territory tracker update failed.", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update tracker status.",
      },
      { status: 500 },
    );
  }
}
