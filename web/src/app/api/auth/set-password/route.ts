import { NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { callBackendApi } from "@/lib/backend-api";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limit = await checkRateLimit(`set-password:${requestFingerprint(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.redirect(appUrl("/set-password?error=rate-limit"));
  }

  const formData = await request.formData();
  const token = String(formData.get("token") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!token) {
    return NextResponse.redirect(appUrl("/set-password?error=invalid-token"));
  }
  if (password.length < 8) {
    return NextResponse.redirect(appUrl(`/set-password?token=${encodeURIComponent(token)}&error=password-too-short`));
  }
  if (password !== confirmPassword) {
    return NextResponse.redirect(appUrl(`/set-password?token=${encodeURIComponent(token)}&error=password-mismatch`));
  }

  try {
    await callBackendApi("auth.set_password", {
      token,
      password,
    });
  } catch {
    return NextResponse.redirect(appUrl("/set-password?error=invalid-token"));
  }

  return NextResponse.redirect(appUrl("/login?password_set=1"));
}
