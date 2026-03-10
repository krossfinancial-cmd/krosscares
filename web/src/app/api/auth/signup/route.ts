import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { setSessionCookie, setSessionIdentityCookie } from "@/lib/auth";
import { callBackendApi } from "@/lib/backend-api";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";

const SignupSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    phone: z.string().trim().min(7).max(30),
    companyName: z.string().trim().max(160).optional(),
    vertical: z.enum(["REALTOR", "DEALER"]),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

function dashboardForRole(role: "REALTOR" | "DEALER") {
  return role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor";
}

export async function POST(request: Request) {
  const limit = await checkRateLimit(`signup:${requestFingerprint(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.redirect(appUrl("/signup?error=rate-limit"));
  }

  const formData = await request.formData();
  const parsed = SignupSchema.safeParse({
    fullName: String(formData.get("fullName") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    companyName: String(formData.get("companyName") || ""),
    vertical: String(formData.get("vertical") || "REALTOR").toUpperCase(),
    password: String(formData.get("password") || ""),
    confirmPassword: String(formData.get("confirmPassword") || ""),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid form input.";
    return NextResponse.redirect(appUrl(`/signup?error=${encodeURIComponent(issue)}`));
  }

  const { fullName, email, phone, companyName, vertical, password } = parsed.data;

  try {
    const result = await callBackendApi<{
      ok: boolean;
      role: "REALTOR" | "DEALER";
      session: { token: string; expiresAt: string };
    }>("auth.signup", {
      fullName,
      email,
      phone,
      companyName,
      vertical,
      password,
    });
    await setSessionCookie(result.session.token, result.session.expiresAt);
    await setSessionIdentityCookie(
      {
        email,
        role: result.role,
      },
      result.session.expiresAt,
    );
    return NextResponse.redirect(appUrl(`${dashboardForRole(result.role)}?welcome=1`));
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("already exists")) {
      return NextResponse.redirect(appUrl("/signup?error=email-exists"));
    }
    return NextResponse.redirect(appUrl(`/signup?error=${encodeURIComponent("create-failed")}`));
  }
}
