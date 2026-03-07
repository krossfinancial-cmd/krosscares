import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runRenewalWorker } from "@/lib/renewals";
import { appUrl } from "@/lib/app-url";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.redirect(appUrl("/login"));
  }

  await runRenewalWorker();
  return NextResponse.redirect(appUrl("/dashboard/admin/renewals?ran=1"));
}
