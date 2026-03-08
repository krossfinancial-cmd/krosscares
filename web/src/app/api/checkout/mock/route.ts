import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { callBackendApi } from "@/lib/backend-api";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "REALTOR" && user.role !== "DEALER")) {
    return NextResponse.redirect(appUrl("/login"));
  }
  const basePath = user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor";

  const formData = await request.formData();
  const zipId = String(formData.get("zipId") || "");

  try {
    await callBackendApi("checkout.mock", {
      zipId,
      userId: user.id,
    });
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : "Payment failed.");
    return NextResponse.redirect(appUrl(`${basePath}/checkout/${zipId}?error=${message}`));
  }

  return NextResponse.redirect(appUrl(`${basePath}/contract/${zipId}`));
}
