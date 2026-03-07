import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signContract } from "@/lib/workflows";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "REALTOR" && user.role !== "DEALER")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const basePath = user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor";

  const formData = await request.formData();
  const zipId = String(formData.get("zipId") || "");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return NextResponse.redirect(new URL(`${basePath}?error=client`, request.url));

  await signContract(zipId, {
    userId: user.id,
    clientId: client.id,
  });

  return NextResponse.redirect(new URL(`${basePath}/contract/${zipId}`, request.url));
}
