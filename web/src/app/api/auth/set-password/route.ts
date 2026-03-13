import { NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const limit = await checkRateLimit(`set-password:${requestFingerprint(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.redirect(appUrl("/set-password?error=rate-limit"));
  }

  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password.length < 8) {
    return NextResponse.redirect(appUrl("/set-password?error=password-too-short"));
  }
  if (password !== confirmPassword) {
    return NextResponse.redirect(appUrl("/set-password?error=password-mismatch"));
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw error;
    }
  } catch {
    return NextResponse.redirect(appUrl("/set-password?error=invalid-token"));
  }

  return NextResponse.redirect(appUrl("/login?password_set=1"));
}
