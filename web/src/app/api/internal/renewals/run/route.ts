import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { callBackendApi } from "@/lib/backend-api";
import { env } from "@/lib/env";

function hasValidCronSecret(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = request.headers.get("x-internal-cron-secret")?.trim();
  return bearer === env.INTERNAL_CRON_SECRET || headerSecret === env.INTERNAL_CRON_SECRET;
}

export async function POST(request: Request) {
  const cronAuthorized = hasValidCronSecret(request);
  const hasPresentedCronSecret = Boolean(
    request.headers.get("authorization")?.trim() || request.headers.get("x-internal-cron-secret")?.trim(),
  );
  const user = cronAuthorized ? null : await getCurrentUser();

  if (!cronAuthorized && hasPresentedCronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!cronAuthorized && (!user || user.role !== "ADMIN")) {
    return NextResponse.redirect(appUrl("/login"));
  }

  await callBackendApi("renewals.run", {
    actorUserId: user?.id ?? null,
  });

  if (cronAuthorized) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.redirect(appUrl("/dashboard/admin/renewals?ran=1"));
}
