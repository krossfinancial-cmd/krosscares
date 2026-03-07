import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/auth";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limit = checkRateLimit(`login:${requestFingerprint(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please retry shortly." }, { status: 429 });
  }

  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const result = await loginWithPassword(email, password);
  if (!result.ok) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url));
  }

  const target =
    result.role === "ADMIN" ? "/dashboard/admin" : result.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor";
  return NextResponse.redirect(new URL(target, request.url));
}
