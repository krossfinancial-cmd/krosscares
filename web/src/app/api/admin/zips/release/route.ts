import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { releaseZip } from "@/lib/workflows";
import { appUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(appUrl("/login"));

  const formData = await request.formData();
  const zipId = String(formData.get("zipId") || "");
  await releaseZip(zipId, user.id);

  return NextResponse.redirect(appUrl("/dashboard/admin/zips?released=1"));
}
