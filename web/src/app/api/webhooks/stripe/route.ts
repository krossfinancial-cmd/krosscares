import { NextResponse } from "next/server";
import { getSupabaseUrl } from "@/lib/supabase/config";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, message: "Missing Stripe-Signature header." }, { status: 400 });
  }

  const response = await fetch(`${getSupabaseUrl().replace(/\/$/, "")}/functions/v1/stripe-webhook`, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") || "application/json",
      "stripe-signature": signature,
    },
    body: await request.text(),
    cache: "no-store",
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
    },
  });
}
