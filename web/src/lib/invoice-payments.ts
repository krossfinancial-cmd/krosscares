import { prisma } from "@/lib/prisma";

export type DashboardOnboardingStatus = "PENDING" | "FORM_COMPLETE" | "SIGNED" | "ACTIVE" | "COMPLETE";

export async function getDashboardOnboardingStatus(
  currentStatus: "PENDING" | "FORM_COMPLETE" | "SIGNED" | "ACTIVE",
  clientId: string,
) {
  if (currentStatus === "ACTIVE") {
    return currentStatus satisfies DashboardOnboardingStatus;
  }

  const paidPayments = await prisma.payment.count({
    where: {
      clientId,
      status: "PAID",
    },
  });

  if (paidPayments > 0) {
    return "COMPLETE" satisfies DashboardOnboardingStatus;
  }

  return currentStatus satisfies DashboardOnboardingStatus;
}
