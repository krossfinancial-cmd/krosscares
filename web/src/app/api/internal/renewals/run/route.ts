import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { callBackendApi } from "@/lib/backend-api";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.redirect(appUrl("/login"));
  }

  await callBackendApi("renewals.run", {
    actorUserId: user.id,
  });
  return NextResponse.redirect(appUrl("/dashboard/admin/renewals?ran=1"));
}
