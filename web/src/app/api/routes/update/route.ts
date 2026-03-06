import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "REALTOR") return NextResponse.redirect(new URL("/login", request.url));

  const formData = await request.formData();
  const clientId = String(formData.get("clientId") || "");
  const leadRoutingEmail = String(formData.get("leadRoutingEmail") || "").trim();
  const leadRoutingPhone = String(formData.get("leadRoutingPhone") || "").trim();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });
  if (!client || client.userId !== user.id) {
    return NextResponse.redirect(new URL("/dashboard/realtor/routing?error=forbidden", request.url));
  }

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: client.id },
      data: {
        leadRoutingEmail,
        leadRoutingPhone,
      },
    });

    await tx.leadRoute.updateMany({
      where: { clientId: client.id },
      data: {
        destinationEmail: leadRoutingEmail,
        destinationPhone: leadRoutingPhone,
      },
    });
  });

  return NextResponse.redirect(new URL("/dashboard/realtor/routing?saved=1", request.url));
}
