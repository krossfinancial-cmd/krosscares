import { NextResponse } from "next/server";
import { callBackendApi } from "@/lib/backend-api";

export async function POST() {
  const result = await callBackendApi<{ ok: boolean; message: string }>("webhooks.stripe");
  return NextResponse.json({
    ok: result.ok,
    message: result.message,
  });
}
