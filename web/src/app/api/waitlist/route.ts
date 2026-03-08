import { NextResponse } from "next/server";
import { callBackendApi } from "@/lib/backend-api";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { appUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  const limit = await checkRateLimit(`waitlist:${requestFingerprint(request)}`, 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const formData = await request.formData();
  const zipCode = String(formData.get("zipCode") || "").trim();
  const verticalInput = String(formData.get("vertical") || "REALTOR").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const businessType = String(formData.get("businessType") || "realtor").trim();
  const vertical = verticalInput === "DEALER" ? "DEALER" : verticalInput === "REALTOR" ? "REALTOR" : null;

  if (!vertical) {
    return NextResponse.json({ error: "Invalid vertical." }, { status: 400 });
  }

  try {
    await callBackendApi("waitlist.join", {
      zipCode,
      vertical,
      name,
      email,
      phone,
      businessType,
    });
  } catch {
    return NextResponse.redirect(appUrl("/waitlist?error=zip-not-found"));
  }

  return NextResponse.redirect(appUrl(`/waitlist?zip=${zipCode}&success=1`));
}
