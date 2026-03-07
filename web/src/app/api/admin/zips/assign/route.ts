import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { assignZipToClientAdmin } from "@/lib/workflows";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(appUrl("/login"));

  const formData = await request.formData();
  const zipId = String(formData.get("zipId") || "").trim();
  const clientId = String(formData.get("clientId") || "").trim();

  if (clientId === "__new__") {
    return NextResponse.redirect(appUrl(`/dashboard/admin/enroll/${zipId}`));
  }

  if (!zipId || !clientId) {
    return NextResponse.redirect(appUrl("/dashboard/admin/zips?error=missing-input"));
  }

  try {
    await assignZipToClientAdmin(zipId, clientId, user.id);
    return NextResponse.redirect(appUrl("/dashboard/admin/zips?assigned=1"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assignment failed.";
    return NextResponse.redirect(appUrl(`/dashboard/admin/zips?error=${encodeURIComponent(message)}`));
  }
}
