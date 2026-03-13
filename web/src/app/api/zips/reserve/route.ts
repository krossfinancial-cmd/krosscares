import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callBackendApi } from "@/lib/backend-api";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { sendZipClaimNotification } from "@/lib/zip-claim-notifications";

export async function POST(request: Request) {
  const limit = await checkRateLimit(`reserve:${requestFingerprint(request)}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user || (user.role !== "REALTOR" && user.role !== "DEALER")) {
    return NextResponse.json({ error: "Unauthorized", redirect: "/login" }, { status: 401 });
  }

  const body = await request.json();
  const zipId = String(body.zipId || "");

  const expectedVertical = user.role === "DEALER" ? "DEALER" : "REALTOR";

  try {
    await callBackendApi("zip.reserve", {
      zipId,
      userId: user.id,
      expectedVertical,
    });

    try {
      const zip = await prisma.zipInventory.findUnique({
        where: { id: zipId },
        select: { zipCode: true },
      });

      await sendZipClaimNotification({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        companyName: user.companyName,
        role: user.role,
        zipCode: zip?.zipCode || null,
        claimStatus: "Reserved",
      });
    } catch (error) {
      console.error("ZIP reservation notification email failed.", error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reservation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
