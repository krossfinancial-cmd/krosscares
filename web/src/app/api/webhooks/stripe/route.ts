import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Stripe webhook endpoint is wired. Local flow currently uses mock payments.",
  });
}
