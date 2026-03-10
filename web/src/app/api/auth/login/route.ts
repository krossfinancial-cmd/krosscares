import { NextResponse } from "next/server";
import { setSessionCookie, setSessionIdentityCookie } from "@/lib/auth";
import { callBackendApi } from "@/lib/backend-api";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { appUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  const limit = await checkRateLimit(`login:${requestFingerprint(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please retry shortly." }, { status: 429 });
  }

  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  try {
    const result = await callBackendApi<{
      ok: boolean;
      role: "ADMIN" | "REALTOR" | "DEALER";
      session: { token: string; expiresAt: string };
    }>("auth.login", {
      email,
      password,
    });
    await setSessionCookie(result.session.token, result.session.expiresAt);
    await setSessionIdentityCookie(
      {
        email: email.toLowerCase().trim(),
        role: result.role,
      },
      result.session.expiresAt,
    );
    const target =
      result.role === "ADMIN" ? "/dashboard/admin" : result.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor";
    return NextResponse.redirect(appUrl(target));
  } catch {
    return NextResponse.redirect(appUrl("/login?error=invalid"));
  }
}
