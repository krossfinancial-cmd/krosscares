import { NextResponse } from "next/server";
import { setSessionCookie, setSessionIdentityCookie } from "@/lib/auth";
import { callBackendApi } from "@/lib/backend-api";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { appUrl } from "@/lib/app-url";

function dashboardForRole(role: "ADMIN" | "REALTOR" | "DEALER") {
  return role === "ADMIN" ? "/dashboard/admin" : role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor";
}

export async function POST(request: Request) {
  const limit = await checkRateLimit(`login:${requestFingerprint(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please retry shortly." }, { status: 429 });
  }

  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const claimZipId = String(formData.get("claimZipId") || "").trim();
  const claimZipCode = String(formData.get("claimZipCode") || "").trim();
  const claimVertical = String(formData.get("claimVertical") || "").trim().toUpperCase();
  const claimParams = new URLSearchParams();
  if (claimZipId) claimParams.set("claimZipId", claimZipId);
  if (claimZipCode) claimParams.set("claimZipCode", claimZipCode);
  if (claimVertical) claimParams.set("claimVertical", claimVertical);

  try {
    const result = await callBackendApi<{
      ok: boolean;
      role: "ADMIN" | "REALTOR" | "DEALER";
      userId: string;
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
    const params = new URLSearchParams();

    if (claimZipId && (result.role === "REALTOR" || result.role === "DEALER")) {
      try {
        await callBackendApi("zip.reserve", {
          zipId: claimZipId,
          userId: result.userId,
          expectedVertical: result.role,
        });
        if (claimZipCode) params.set("claimed_zip", claimZipCode);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to reserve ZIP.";
        params.set("claim_error", message);
        if (claimZipCode) params.set("claim_zip", claimZipCode);
      }
    }

    const target = dashboardForRole(result.role);
    const query = params.toString();
    return NextResponse.redirect(appUrl(query ? `${target}?${query}` : target));
  } catch {
    claimParams.set("error", "invalid");
    return NextResponse.redirect(appUrl(`/login?${claimParams.toString()}`));
  }
}
