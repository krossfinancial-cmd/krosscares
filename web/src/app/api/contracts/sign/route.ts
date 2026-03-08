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

  await callBackendApi("contract.sign", {
    zipId,
    userId: user.id,
  });

  return NextResponse.redirect(appUrl(`${basePath}/contract/${zipId}`));
}
