import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { reserveZip } from "@/lib/workflows";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";

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
  const zip = await prisma.zipInventory.findUnique({ where: { id: zipId } });
  if (!zip) return NextResponse.json({ error: "ZIP not found." }, { status: 404 });

  const expectedVertical = user.role === "DEALER" ? "DEALER" : "REALTOR";
  if (zip.vertical !== expectedVertical) {
    return NextResponse.json({ error: "ZIP vertical mismatch." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) {
    return NextResponse.json({ error: "Client profile missing." }, { status: 400 });
  }
  if (client.vertical !== expectedVertical) {
    return NextResponse.json({ error: "Client vertical profile mismatch." }, { status: 400 });
  }

  try {
    await reserveZip(zipId, {
      userId: user.id,
      clientId: client.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reservation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
