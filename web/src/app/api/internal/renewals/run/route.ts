import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runRenewalWorker } from "@/lib/renewals";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  await runRenewalWorker();
  return NextResponse.redirect(new URL("/dashboard/admin/renewals?ran=1", request.url));
}
