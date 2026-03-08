import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callBackendApi } from "@/lib/backend-api";
import { uploadFile } from "@/lib/storage";
import { appUrl } from "@/lib/app-url";

function ensureFile(file: unknown, label: string) {
  if (!(file instanceof File)) throw new Error(`${label} is required.`);
  if (file.size > 5 * 1024 * 1024) throw new Error(`${label} must be 5MB or less.`);
  return file;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "REALTOR" && user.role !== "DEALER")) {
    return NextResponse.redirect(appUrl("/login"));
  }
  const basePath = user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor";

  const territoriesPath = `${basePath}/territories`;
  try {
    const formData = await request.formData();
    const zipId = String(formData.get("zipId") || "");
    const fullName = String(formData.get("fullName") || "").trim();
    const companyName = String(formData.get("companyName") || "").trim();
    const licenseNumber = String(formData.get("licenseNumber") || "").trim();
    const website = String(formData.get("website") || "").trim();
    const leadRoutingEmail = String(formData.get("leadRoutingEmail") || "").trim();
    const leadRoutingPhone = String(formData.get("leadRoutingPhone") || "").trim();

    if (!zipId) {
      return NextResponse.redirect(appUrl(`${territoriesPath}?error=zip-not-assigned`));
    }

    const headshot = ensureFile(formData.get("headshot"), "Headshot");
    const logo = ensureFile(formData.get("logo"), "Logo");

    const [headshotUrl, logoUrl] = await Promise.all([uploadFile(headshot, "headshots"), uploadFile(logo, "logos")]);

    const result = await callBackendApi<{ ok: boolean; activated: boolean }>("onboarding.finalize", {
      zipId,
      userId: user.id,
      fullName,
      companyName,
      licenseNumber,
      website: website || null,
      leadRoutingEmail,
      leadRoutingPhone,
      headshotUrl,
      logoUrl,
    });

    if (!result.activated) {
      return NextResponse.redirect(appUrl(`${basePath}/contract/${zipId}?info=onboarding-complete`));
    }
    return NextResponse.redirect(appUrl(`${basePath}?onboarding=complete`));
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message.trim() : "Onboarding failed.";
    const message = encodeURIComponent(rawMessage || "Onboarding failed.");

    if (rawMessage.toLowerCase().includes("body") || rawMessage.toLowerCase().includes("formdata")) {
      return NextResponse.redirect(
        appUrl(
          `${territoriesPath}?error=${encodeURIComponent(
            "Upload failed. Please retry with JPG/PNG files under 5MB each.",
          )}`,
        ),
      );
    }

    return NextResponse.redirect(appUrl(`${territoriesPath}?error=${message}`));
  }
}
