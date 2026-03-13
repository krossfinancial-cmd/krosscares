import { NextResponse } from "next/server";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { appUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { sendZipClaimNotification } from "@/lib/zip-claim-notifications";
import { createOptionalServerSupabaseClient } from "@/lib/supabase/server";

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
    const supabase = await createOptionalServerSupabaseClient();

    if (!supabase) {
      claimParams.set("error", "auth-unavailable");
      return NextResponse.redirect(appUrl(`/login?${claimParams.toString()}`));
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw new Error("Invalid credentials.");
    }

    const user = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
        phone: true,
        companyName: true,
      },
    });

    if (!user) {
      await supabase.auth.signOut();
      throw new Error("No application account found.");
    }

    const params = new URLSearchParams();

    if (claimZipId && (user.role === "REALTOR" || user.role === "DEALER")) {
      try {
        const { callBackendApi } = await import("@/lib/backend-api");
        await callBackendApi("zip.reserve", {
          zipId: claimZipId,
          userId: user.id,
          expectedVertical: user.role,
        });

        try {
          const zip = await prisma.zipInventory.findUnique({
            where: { id: claimZipId },
            select: { zipCode: true },
          });

          await sendZipClaimNotification({
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            companyName: user.companyName,
            role: user.role,
            zipCode: zip?.zipCode || claimZipCode || claimZipId,
            claimStatus: "Reserved",
          });
        } catch (error) {
          console.error("Login ZIP reservation notification email failed.", error);
        }

        if (claimZipCode) params.set("claimed_zip", claimZipCode);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to reserve ZIP.";
        params.set("claim_error", message);
        if (claimZipCode) params.set("claim_zip", claimZipCode);
      }
    }

    const target = dashboardForRole(user.role);
    const query = params.toString();
    return NextResponse.redirect(appUrl(query ? `${target}?${query}` : target));
  } catch {
    claimParams.set("error", "invalid");
    return NextResponse.redirect(appUrl(`/login?${claimParams.toString()}`));
  }
}
