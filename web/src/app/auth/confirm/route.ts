import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

function normalizeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/login";
  }

  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const next = normalizeNext(searchParams.get("next"));
  const rawType = searchParams.get("type");

  if (!tokenHash || !rawType || !EMAIL_OTP_TYPES.has(rawType as EmailOtpType)) {
    return NextResponse.redirect(appUrl("/set-password?error=invalid-token"));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: rawType as EmailOtpType,
  });

  if (error) {
    return NextResponse.redirect(appUrl("/set-password?error=invalid-token"));
  }

  return NextResponse.redirect(appUrl(next));
}
