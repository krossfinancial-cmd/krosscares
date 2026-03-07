import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { appUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  const limit = checkRateLimit(`waitlist:${requestFingerprint(request)}`, 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const formData = await request.formData();
  const zipCode = String(formData.get("zipCode") || "").trim();
  const vertical = String(formData.get("vertical") || "REALTOR").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const businessType = String(formData.get("businessType") || "realtor").trim();

  const zip = await prisma.zipInventory.findUnique({
    where: {
      zipCode_vertical: {
        zipCode,
        vertical: vertical as "REALTOR" | "DEALER",
      },
    },
  });

  if (!zip) {
    return NextResponse.redirect(appUrl("/waitlist?error=zip-not-found"));
  }

  await prisma.waitlist.create({
    data: {
      zipId: zip.id,
      zipCode,
      vertical: vertical as "REALTOR" | "DEALER",
      name,
      email,
      phone,
      businessType,
    },
  });

  return NextResponse.redirect(appUrl(`/waitlist?zip=${zipCode}&success=1`));
}
