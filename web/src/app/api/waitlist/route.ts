import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const formData = await request.formData();
  const zipCode = String(formData.get("zipCode") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const businessType = String(formData.get("businessType") || "realtor").trim();

  const zip = await prisma.zipInventory.findUnique({
    where: { zipCode },
  });

  if (!zip) {
    return NextResponse.redirect(new URL("/waitlist?error=zip-not-found", request.url));
  }

  await prisma.waitlist.create({
    data: {
      zipId: zip.id,
      zipCode,
      name,
      email,
      phone,
      businessType,
    },
  });

  return NextResponse.redirect(new URL(`/waitlist?zip=${zipCode}&success=1`, request.url));
}
