import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { callBackendApi } from "@/lib/backend-api";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(appUrl("/login"));

  const formData = await request.formData();
  const zipId = String(formData.get("zipId") || "");
  await callBackendApi("admin.zip.release", {
    zipId,
    actorUserId: user.id,
  });

  return NextResponse.redirect(appUrl("/dashboard/admin/inventory-manager?released=1"));
}
