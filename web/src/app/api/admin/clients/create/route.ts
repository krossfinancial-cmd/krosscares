import { NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/auth";
import { callBackendApi } from "@/lib/backend-api";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(appUrl("/login"));

  const formData = await request.formData();
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const verticalInput = String(formData.get("vertical") || "REALTOR").toUpperCase().trim();

  if (!fullName || !email || !password) {
    return NextResponse.redirect(appUrl("/dashboard/admin/clients?error=missing-required-fields"));
  }
  if (password.length < 8) {
    return NextResponse.redirect(appUrl("/dashboard/admin/clients?error=password-too-short"));
  }

  const vertical = verticalInput === "DEALER" ? "DEALER" : "REALTOR";

  try {
    await callBackendApi("admin.client.create", {
      actorUserId: user.id,
      fullName,
      email,
      password,
      companyName,
      phone,
      vertical,
    });

    return NextResponse.redirect(appUrl("/dashboard/admin/clients?created=1"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create client.";
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate")) {
      return NextResponse.redirect(appUrl("/dashboard/admin/clients?error=email-already-exists"));
    }
    return NextResponse.redirect(appUrl(`/dashboard/admin/clients?error=${encodeURIComponent("create-failed")}`));
  }
}
