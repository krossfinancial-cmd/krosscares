import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completeMockPayment } from "@/lib/workflows";
import { appUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "REALTOR" && user.role !== "DEALER")) {
    return NextResponse.redirect(appUrl("/login"));
  }
  const basePath = user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor";

  const formData = await request.formData();
  const zipId = String(formData.get("zipId") || "");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return NextResponse.redirect(appUrl(`${basePath}?error=client`));

  try {
    await completeMockPayment(zipId, {
      userId: user.id,
      clientId: client.id,
    });
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : "Payment failed.");
    return NextResponse.redirect(appUrl(`${basePath}/checkout/${zipId}?error=${message}`));
  }

  return NextResponse.redirect(appUrl(`${basePath}/contract/${zipId}`));
}
