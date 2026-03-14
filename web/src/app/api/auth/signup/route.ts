import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { callBackendApi } from "@/lib/backend-api";
import { createSupabaseAuthUser, deleteSupabaseAuthUser } from "@/lib/auth-admin";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { getSupabaseAuthConfigStatus } from "@/lib/supabase/config";
import { createOptionalServerSupabaseClient } from "@/lib/supabase/server";
import { sendZipClaimNotification } from "@/lib/zip-claim-notifications";

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

function buildDashboardRedirect(role: "REALTOR" | "DEALER", options: { claimedZip?: string; claimError?: string; claimZip?: string }) {
  const params = new URLSearchParams();
  params.set("welcome", "1");
  if (options.claimedZip) params.set("claimed_zip", options.claimedZip);
  if (options.claimError) params.set("claim_error", options.claimError);
  if (options.claimZip) params.set("claim_zip", options.claimZip);
  return `${dashboardForRole(role)}?${params.toString()}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const claimZipId = String(formData.get("claimZipId") || "").trim();
  const claimZipCode = String(formData.get("claimZipCode") || "").trim();
  const claimVertical = String(formData.get("claimVertical") || "").trim().toUpperCase();
  const claimParams = new URLSearchParams();
  if (claimZipId) claimParams.set("claimZipId", claimZipId);
  if (claimZipCode) claimParams.set("claimZipCode", claimZipCode);
  if (claimVertical) claimParams.set("claimVertical", claimVertical);

  const limit = await checkRateLimit(`signup:${requestFingerprint(request)}`, 20, 60_000);
  if (!limit.allowed) {
    claimParams.set("error", "rate-limit");
    return NextResponse.redirect(appUrl(`/signup?${claimParams.toString()}`));
  }

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
    claimParams.set("error", issue);
    return NextResponse.redirect(appUrl(`/signup?${claimParams.toString()}`));
  }

  const { fullName, email, phone, companyName, vertical, password } = parsed.data;
  let claimedZip: string | null = null;
  let claimError: string | null = null;
  const role: UserRole = vertical === "DEALER" ? "DEALER" : "REALTOR";

  if (!getSupabaseAuthConfigStatus().canSignUp) {
    claimParams.set("error", "auth-unavailable");
    return NextResponse.redirect(appUrl(`/signup?${claimParams.toString()}`));
  }

  try {
    const authUser = await createSupabaseAuthUser({
      email,
      password,
      fullName,
      role,
    });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: authUser.id,
            fullName,
            email,
            phone,
            companyName: companyName || null,
            role,
          },
        });

        await tx.client.create({
          data: {
            userId: authUser.id,
            vertical,
            leadRoutingEmail: email,
            leadRoutingPhone: phone,
            preferredContactMethod: "EMAIL",
            onboardingStatus: "PENDING",
            serviceState: "NC",
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: authUser.id,
            action: "auth.signup",
            entityType: "user",
            entityId: authUser.id,
            metadata: {
              vertical,
            },
          },
        });
      });
    } catch (error) {
      await deleteSupabaseAuthUser(authUser.id);
      throw error;
    }

    if (claimZipId) {
      try {
        await callBackendApi("zip.reserve", {
          zipId: claimZipId,
          userId: authUser.id,
          expectedVertical: role,
        });
        claimedZip = claimZipCode || null;
      } catch (error) {
        claimError = error instanceof Error ? error.message : "Unable to reserve ZIP.";
      }
    }

    try {
      await sendZipClaimNotification({
        fullName,
        email,
        phone,
        companyName,
        role,
        zipCode: claimZipId ? claimZipCode || claimZipId : null,
        claimStatus: claimZipId ? (claimError ? `Failed: ${claimError}` : "Reserved") : null,
      });
    } catch (error) {
      console.error("Signup notification email failed.", error);
    }

    const supabase = await createOptionalServerSupabaseClient();

    if (!supabase) {
      claimParams.set("error", "auth-unavailable");
      return NextResponse.redirect(appUrl(`/signup?${claimParams.toString()}`));
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw signInError;
    }

    return NextResponse.redirect(
      appUrl(
        buildDashboardRedirect(role, {
          claimedZip: claimedZip || undefined,
          claimError: claimError || undefined,
          claimZip: claimZipCode || undefined,
        }),
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("already exists") || message.includes("already been registered") || message.includes("duplicate")) {
      claimParams.set("error", "email-exists");
      return NextResponse.redirect(appUrl(`/signup?${claimParams.toString()}`));
    }
    claimParams.set("error", "create-failed");
    return NextResponse.redirect(appUrl(`/signup?${claimParams.toString()}`));
  }
}
