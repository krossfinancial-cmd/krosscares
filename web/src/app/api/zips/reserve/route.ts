import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callBackendApi } from "@/lib/backend-api";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limit = await checkRateLimit(`reserve:${requestFingerprint(request)}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user || (user.role !== "REALTOR" && user.role !== "DEALER")) {
    return NextResponse.json({ error: "Unauthorized", redirect: "/login" }, { status: 401 });
  }

  const body = await request.json();
  const zipId = String(body.zipId || "");

  const expectedVertical = user.role === "DEALER" ? "DEALER" : "REALTOR";

  try {
    await callBackendApi("zip.reserve", {
      zipId,
      userId: user.id,
      expectedVertical,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reservation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
