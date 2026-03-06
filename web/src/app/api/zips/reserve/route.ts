import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { reserveZip } from "@/lib/workflows";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "REALTOR") {
    return NextResponse.json({ error: "Unauthorized", redirect: "/login" }, { status: 401 });
  }

  const body = await request.json();
  const zipId = String(body.zipId || "");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) {
    return NextResponse.json({ error: "Client profile missing." }, { status: 400 });
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
