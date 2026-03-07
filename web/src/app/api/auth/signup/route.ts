import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole, Vertical } from "@prisma/client";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

function roleForVertical(vertical: Vertical): UserRole {
  return vertical === "DEALER" ? "DEALER" : "REALTOR";
}

function dashboardForRole(role: UserRole) {
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
  const role = roleForVertical(vertical);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.redirect(appUrl("/signup?error=email-exists"));
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          fullName,
          email,
          phone,
          companyName: companyName || null,
          passwordHash,
          role,
        },
      });

      await tx.client.create({
        data: {
          userId: createdUser.id,
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
          actorUserId: createdUser.id,
          action: "auth.signup",
          entityType: "user",
          entityId: createdUser.id,
          metadata: {
            vertical,
          },
        },
      });

      return createdUser;
    });

    await createSession(user.id);
    return NextResponse.redirect(appUrl(`${dashboardForRole(user.role)}?welcome=1`));
  } catch {
    return NextResponse.redirect(appUrl("/signup?error=create-failed"));
  }
}
