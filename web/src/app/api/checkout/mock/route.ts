import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completeMockPayment } from "@/lib/workflows";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "REALTOR") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const zipId = String(formData.get("zipId") || "");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return NextResponse.redirect(new URL("/dashboard/realtor?error=client", request.url));

  await completeMockPayment(zipId, {
    userId: user.id,
    clientId: client.id,
  });

  return NextResponse.redirect(new URL(`/dashboard/realtor/contract/${zipId}`, request.url));
}
