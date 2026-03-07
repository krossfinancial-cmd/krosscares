import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole, Vertical } from "@prisma/client";
import { appUrl } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(appUrl("/login"));

  const formData = await request.formData();
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const verticalInput = String(formData.get("vertical") || "REALTOR").toUpperCase().trim();

  if (!fullName || !email || !password) {
    return NextResponse.redirect(appUrl("/dashboard/admin/clients?error=missing-required-fields"));
  }
  if (password.length < 8) {
    return NextResponse.redirect(appUrl("/dashboard/admin/clients?error=password-too-short"));
  }

  const vertical = verticalInput === "DEALER" ? Vertical.DEALER : Vertical.REALTOR;
  const role = vertical === Vertical.DEALER ? UserRole.DEALER : UserRole.REALTOR;

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          companyName: companyName || null,
          phone: phone || null,
          role,
        },
      });

      const createdClient = await tx.client.create({
        data: {
          userId: createdUser.id,
          vertical,
          serviceState: "NC",
          leadRoutingEmail: email,
          leadRoutingPhone: phone || "",
          preferredContactMethod: "EMAIL",
          onboardingStatus: "PENDING",
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "client.created_admin",
          entityType: "client",
          entityId: createdClient.id,
          metadata: {
            email,
            vertical,
          },
        },
      });
    });

    return NextResponse.redirect(appUrl("/dashboard/admin/clients?created=1"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create client.";
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate")) {
      return NextResponse.redirect(appUrl("/dashboard/admin/clients?error=email-already-exists"));
    }
    return NextResponse.redirect(appUrl(`/dashboard/admin/clients?error=${encodeURIComponent("create-failed")}`));
  }
}
