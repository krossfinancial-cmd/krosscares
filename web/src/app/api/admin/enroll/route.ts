import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole, Vertical } from "@prisma/client";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";
import { issuePasswordSetupToken } from "@/lib/password-setup";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { assignZipToClientAdmin, reassignZipToClientAdmin } from "@/lib/workflows";

const AdminEnrollSchema = z.object({
  zipId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(160),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(7).max(30),
  licenseNumber: z.string().trim().max(120).optional(),
  website: z.string().trim().max(255).optional(),
  leadRoutingEmail: z.email().trim().toLowerCase(),
  leadRoutingPhone: z.string().trim().min(7).max(30),
  paymentCollected: z.literal("on"),
});

function roleForVertical(vertical: Vertical): UserRole {
  return vertical === "DEALER" ? "DEALER" : "REALTOR";
}

function optionalFile(value: FormDataEntryValue | null, label: string) {
  if (!(value instanceof File)) return null;
  if (value.size === 0) return null;
  if (value.size > 5 * 1024 * 1024) throw new Error(`${label} must be 5MB or less.`);
  return value;
}

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.redirect(appUrl("/login"));

  const formData = await request.formData();
  const rawZipId = String(formData.get("zipId") || "").trim();

  const parsed = AdminEnrollSchema.safeParse({
    zipId: rawZipId,
    fullName: String(formData.get("fullName") || ""),
    companyName: String(formData.get("companyName") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    licenseNumber: String(formData.get("licenseNumber") || ""),
    website: String(formData.get("website") || ""),
    leadRoutingEmail: String(formData.get("leadRoutingEmail") || ""),
    leadRoutingPhone: String(formData.get("leadRoutingPhone") || ""),
    paymentCollected: String(formData.get("paymentCollected") || ""),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid form input.";
    return NextResponse.redirect(appUrl(`/dashboard/admin/enroll/${rawZipId}?error=${encodeURIComponent(issue)}`));
  }

  const zip = await prisma.zipInventory.findUnique({ where: { id: parsed.data.zipId } });
  if (!zip) {
    return NextResponse.redirect(appUrl("/dashboard/admin/zips?error=zip-not-found"));
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return NextResponse.redirect(appUrl(`/dashboard/admin/enroll/${zip.id}?error=${encodeURIComponent("Email already exists.")}`));
  }

  try {
    const headshot = optionalFile(formData.get("headshot"), "Headshot");
    const logo = optionalFile(formData.get("logo"), "Company logo");

    const [headshotUrl, logoUrl] = await Promise.all([
      headshot ? uploadFile(headshot, "headshots") : Promise.resolve<string | null>(null),
      logo ? uploadFile(logo, "logos") : Promise.resolve<string | null>(null),
    ]);

    const temporaryPassword = randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const role = roleForVertical(zip.vertical);

    const createdClient = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          phone: parsed.data.phone,
          companyName: parsed.data.companyName,
          role,
          passwordHash,
        },
      });

      const client = await tx.client.create({
        data: {
          userId: createdUser.id,
          vertical: zip.vertical,
          licenseNumber: parsed.data.licenseNumber || null,
          website: parsed.data.website || null,
          headshotUrl,
          logoUrl,
          leadRoutingEmail: parsed.data.leadRoutingEmail,
          leadRoutingPhone: parsed.data.leadRoutingPhone,
          preferredContactMethod: "EMAIL",
          onboardingStatus: "FORM_COMPLETE",
          serviceState: zip.state,
          serviceCity: zip.city,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "client.enrolled_admin",
          entityType: "client",
          entityId: client.id,
          metadata: {
            zipId: zip.id,
            zipCode: zip.zipCode,
            vertical: zip.vertical,
          },
        },
      });

      return {
        user: createdUser,
        client,
      };
    });

    if (zip.status === "SOLD" || (zip.status === "RESERVED" && zip.assignedClientId)) {
      await reassignZipToClientAdmin(zip.id, createdClient.client.id, admin.id);
    } else {
      await assignZipToClientAdmin(zip.id, createdClient.client.id, admin.id);
    }

    const setup = await issuePasswordSetupToken(createdClient.user.id);
    const setupUrl = `${process.env.APP_URL || "http://localhost:3000"}/set-password?token=${setup.token}`;

    try {
      await sendEmail(
        createdClient.user.email,
        "Set your Kross Cares Territories password",
        [
          `Hi ${createdClient.user.fullName},`,
          "",
          `Your ${zip.vertical.toLowerCase()} account for ZIP ${zip.zipCode} is enrolled and active.`,
          "Use the link below to set your password:",
          setupUrl,
          "",
          `This link expires on ${setup.expiresAt.toISOString()}.`,
        ].join("\n"),
      );
    } catch {
      return NextResponse.redirect(
        appUrl("/dashboard/admin/zips?assigned=1&error=Assigned%20but%20invite%20email%20failed%20to%20send."),
      );
    }

    return NextResponse.redirect(appUrl("/dashboard/admin/zips?assigned=1&invited=1"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrollment failed.";
    return NextResponse.redirect(appUrl(`/dashboard/admin/enroll/${zip.id}?error=${encodeURIComponent(message)}`));
  }
}
