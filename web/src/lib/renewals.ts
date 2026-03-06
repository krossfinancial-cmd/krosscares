import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

export async function runRenewalWorker() {
  const now = new Date();
  const candidateZips = await prisma.zipInventory.findMany({
    where: {
      status: "SOLD",
      renewalDate: {
        not: null,
      },
    },
    include: {
      assignedClient: {
        include: {
          user: true,
        },
      },
      waitlistEntries: true,
    },
  });

  for (const zip of candidateZips) {
    if (!zip.renewalDate || !zip.assignedClient) continue;

    const daysLeft = differenceInCalendarDays(zip.renewalDate, now);
    const checkpoints = [60, 30, 7];
    if (checkpoints.includes(daysLeft)) {
      const existing = await prisma.renewalReminder.findUnique({
        where: {
          zipId_daysBefore: {
            zipId: zip.id,
            daysBefore: daysLeft,
          },
        },
      });

      if (!existing) {
        await prisma.renewalReminder.create({
          data: {
            zipId: zip.id,
            daysBefore: daysLeft,
          },
        });

        await sendEmail(
          zip.assignedClient.user.email,
          `ZIP ${zip.zipCode} renews in ${daysLeft} days`,
          `Your territory for ZIP ${zip.zipCode} renews on ${zip.renewalDate.toDateString()}.`,
        );
      }
    }

    if (daysLeft < -7) {
      await prisma.$transaction(async (tx) => {
        await tx.leadRoute.updateMany({
          where: { zipCode: zip.zipCode },
          data: { active: false },
        });

        await tx.zipInventory.update({
          where: { id: zip.id },
          data: {
            status: "AVAILABLE",
            assignedClientId: null,
            reservationExpiresAt: null,
            renewalDate: null,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "zip.auto_released",
            entityType: "zip_inventory",
            entityId: zip.id,
            metadata: {
              zipCode: zip.zipCode,
              reason: "renewal_expired",
            },
          },
        });
      });

      for (const entry of zip.waitlistEntries.filter((w) => w.status === "PENDING")) {
        await sendEmail(
          entry.email,
          `ZIP ${zip.zipCode} is available`,
          `ZIP ${zip.zipCode} is now available again. Claim it from the marketplace.`,
        );
        await prisma.waitlist.update({
          where: { id: entry.id },
          data: { status: "NOTIFIED" },
        });
      }
    }
  }

  return { checked: candidateZips.length };
}
