import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { callBackendApi } from "@/lib/backend-api";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";
import { uploadFile } from "@/lib/storage";

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

  try {
    const headshot = optionalFile(formData.get("headshot"), "Headshot");
    const logo = optionalFile(formData.get("logo"), "Company logo");

    const [headshotUrl, logoUrl] = await Promise.all([
      headshot ? uploadFile(headshot, "headshots") : Promise.resolve<string | null>(null),
      logo ? uploadFile(logo, "logos") : Promise.resolve<string | null>(null),
    ]);

    const result = await callBackendApi<{
      ok: boolean;
      invite: {
        email: string;
        fullName: string;
        token: string;
        expiresAt: string;
      };
      zip: {
        zipCode: string;
        vertical: "REALTOR" | "DEALER";
      };
    }>("admin.enroll", {
      actorUserId: admin.id,
      zipId: parsed.data.zipId,
      fullName: parsed.data.fullName,
      companyName: parsed.data.companyName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      licenseNumber: parsed.data.licenseNumber || null,
      website: parsed.data.website || null,
      leadRoutingEmail: parsed.data.leadRoutingEmail,
      leadRoutingPhone: parsed.data.leadRoutingPhone,
      headshotUrl,
      logoUrl,
    });

    const setupUrl = `${process.env.APP_URL || "http://localhost:3000"}/set-password?token=${result.invite.token}`;

    try {
      await sendEmail(
        result.invite.email,
        "Set your Kross Cares Territories password",
        [
          `Hi ${result.invite.fullName},`,
          "",
          `Your ${result.zip.vertical.toLowerCase()} account for ZIP ${result.zip.zipCode} is enrolled and active.`,
          "Use the link below to set your password:",
          setupUrl,
          "",
          `This link expires on ${new Date(result.invite.expiresAt).toISOString()}.`,
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
    return NextResponse.redirect(appUrl(`/dashboard/admin/enroll/${rawZipId}?error=${encodeURIComponent(message)}`));
  }
}
