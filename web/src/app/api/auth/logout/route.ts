import { NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { clearSession } from "@/lib/auth";

export async function POST() {
  await clearSession();
  return NextResponse.redirect(appUrl("/login?logged_out=1"));
}
