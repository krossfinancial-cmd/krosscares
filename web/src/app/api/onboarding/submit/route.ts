import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { attemptActivation, completeOnboarding } from "@/lib/workflows";
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

  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return NextResponse.redirect(appUrl(`${basePath}?error=client`));

  const formData = await request.formData();
  const zipId = String(formData.get("zipId") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const licenseNumber = String(formData.get("licenseNumber") || "").trim();
  const website = String(formData.get("website") || "").trim();
  const leadRoutingEmail = String(formData.get("leadRoutingEmail") || "").trim();
  const leadRoutingPhone = String(formData.get("leadRoutingPhone") || "").trim();
  const territoriesPath = `${basePath}/territories`;

  if (!zipId) {
    return NextResponse.redirect(appUrl(`${territoriesPath}?error=zip-not-assigned`));
  }

  const zip = await prisma.zipInventory.findUnique({
    where: { id: zipId },
  });
  if (!zip || zip.assignedClientId !== client.id) {
    return NextResponse.redirect(appUrl(`${territoriesPath}?error=zip-not-assigned`));
  }

  try {
    const headshot = ensureFile(formData.get("headshot"), "Headshot");
    const logo = ensureFile(formData.get("logo"), "Logo");

    const [headshotUrl, logoUrl] = await Promise.all([uploadFile(headshot, "headshots"), uploadFile(logo, "logos")]);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          fullName,
          companyName,
        },
      });

      await tx.client.update({
        where: { id: client.id },
        data: {
          licenseNumber,
          website: website || null,
          headshotUrl,
          logoUrl,
          leadRoutingEmail,
          leadRoutingPhone,
        },
      });
    });

    await completeOnboarding(zipId, { userId: user.id, clientId: client.id });
    await attemptActivation(zipId, { userId: user.id, clientId: client.id });

    return NextResponse.redirect(appUrl(`${basePath}?onboarding=complete`));
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message.trim() : "Onboarding failed.";
    const message = encodeURIComponent(rawMessage || "Onboarding failed.");
    return NextResponse.redirect(appUrl(`${basePath}/onboarding/${zipId}?error=${message}`));
  }
}
