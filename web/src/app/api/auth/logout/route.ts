import { NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { clearSessionCookie, getSessionToken } from "@/lib/auth";
import { callBackendApi } from "@/lib/backend-api";

export async function POST() {
  const token = await getSessionToken();
  if (token) {
    await callBackendApi("auth.logout", { token }).catch(() => null);
  }
  await clearSessionCookie();
  return NextResponse.redirect(appUrl("/login?logged_out=1"));
}
