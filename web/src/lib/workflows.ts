import { addDays } from "date-fns";
import { ContractStatus, OnboardingFormStatus, PaymentStatus, ZipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type WorkflowActor = {
  userId: string;
  clientId: string;
};

async function audit(actorUserId: string, action: string, entityType: string, entityId: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      metadata: metadata as object | undefined,
    },
  });
}

export async function reserveZip(zipId: string, actor: WorkflowActor) {
  const expiration = addDays(new Date(), 0);
  expiration.setMinutes(expiration.getMinutes() + 30);

  return prisma.$transaction(async (tx) => {
    const zip = await tx.zipInventory.findUnique({
      where: { id: zipId },
    });
    if (!zip) throw new Error("ZIP not found.");
    if (zip.status === ZipStatus.BLOCKED || zip.status === ZipStatus.SOLD) throw new Error("ZIP is unavailable.");
    if (zip.status === ZipStatus.RESERVED && zip.reservationExpiresAt && zip.reservationExpiresAt > new Date()) {
      throw new Error("ZIP is currently reserved by another client.");
    }

    const updated = await tx.zipInventory.update({
      where: { id: zip.id },
      data: {
        status: ZipStatus.RESERVED,
        assignedClientId: actor.clientId,
        reservationExpiresAt: expiration,
      },
    });

    await tx.payment.create({
      data: {
        clientId: actor.clientId,
        zipId: updated.id,
        amountCents: updated.annualPriceCents,
        provider: "mock",
        status: PaymentStatus.PENDING,
      },
    });

    await tx.contract.create({
      data: {
        clientId: actor.clientId,
        zipId: updated.id,
        status: ContractStatus.DRAFT,
      },
    });

    await tx.onboardingForm.upsert({
      where: {
        clientId_zipId: {
          clientId: actor.clientId,
          zipId: updated.id,
        },
      },
      update: {
        status: OnboardingFormStatus.NOT_SENT,
      },
      create: {
        clientId: actor.clientId,
        zipId: updated.id,
        status: OnboardingFormStatus.NOT_SENT,
      },
    });

    await audit(actor.userId, "zip.reserved", "zip_inventory", updated.id, {
      zipCode: updated.zipCode,
      expiresAt: expiration.toISOString(),
    });

    return updated;
  });
}

export async function completeMockPayment(zipId: string, actor: WorkflowActor) {
  await prisma.$transaction(async (tx) => {
    const zip = await tx.zipInventory.findUnique({
      where: { id: zipId },
    });
    if (!zip) throw new Error("ZIP not found.");
    if (zip.assignedClientId !== actor.clientId) throw new Error("ZIP is not assigned to this account.");
    if (zip.status !== ZipStatus.RESERVED) throw new Error("ZIP must be reserved before payment.");

    await tx.payment.updateMany({
      where: {
        clientId: actor.clientId,
        zipId,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      },
    });

    await tx.contract.updateMany({
      where: {
        clientId: actor.clientId,
        zipId,
      },
      data: {
        status: ContractStatus.SENT,
        sentAt: new Date(),
      },
    });

    await tx.onboardingForm.updateMany({
      where: {
        clientId: actor.clientId,
        zipId,
      },
      data: {
        status: OnboardingFormStatus.SENT,
      },
    });

    await audit(actor.userId, "payment.completed", "zip_inventory", zipId, {
      provider: "mock",
    });
  });
}

export async function signContract(zipId: string, actor: WorkflowActor) {
  await prisma.contract.updateMany({
    where: {
      clientId: actor.clientId,
      zipId,
      status: ContractStatus.SENT,
    },
    data: {
      status: ContractStatus.SIGNED,
      signedAt: new Date(),
      documentUrl: "https://example.local/contracts/territory-agreement.pdf",
    },
  });

  await audit(actor.userId, "contract.signed", "zip_inventory", zipId);
}

export async function completeOnboarding(zipId: string, actor: WorkflowActor) {
  await prisma.onboardingForm.updateMany({
    where: {
      clientId: actor.clientId,
      zipId,
    },
    data: {
      status: OnboardingFormStatus.COMPLETED,
      submittedAt: new Date(),
    },
  });

  await prisma.client.update({
    where: { id: actor.clientId },
    data: {
      onboardingStatus: "FORM_COMPLETE",
    },
  });

  await audit(actor.userId, "onboarding.completed", "zip_inventory", zipId);
}

export async function attemptActivation(zipId: string, actor: WorkflowActor) {
  const client = await prisma.client.findUnique({
    where: { id: actor.clientId },
  });
  if (!client) throw new Error("Client profile not found.");

  const zip = await prisma.zipInventory.findUnique({
    where: { id: zipId },
    include: {
      payments: {
        where: {
          clientId: actor.clientId,
        },
      },
      contracts: {
        where: {
          clientId: actor.clientId,
        },
      },
      onboardingForms: {
        where: {
          clientId: actor.clientId,
        },
      },
    },
  });

  if (!zip) throw new Error("ZIP not found.");
  if (zip.assignedClientId !== actor.clientId) throw new Error("ZIP assignment mismatch.");

  const hasPaid = zip.payments.some((p) => p.status === PaymentStatus.PAID);
  const hasSigned = zip.contracts.some((c) => c.status === ContractStatus.SIGNED);
  const hasOnboarded = zip.onboardingForms.some((o) => o.status === OnboardingFormStatus.COMPLETED);

  if (!hasPaid || !hasSigned || !hasOnboarded) {
    throw new Error("Activation requirements are not complete.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.zipInventory.update({
      where: { id: zip.id },
      data: {
        status: ZipStatus.SOLD,
        renewalDate: addDays(new Date(), 365),
        reservationExpiresAt: null,
      },
    });

    await tx.client.update({
      where: { id: actor.clientId },
      data: {
        onboardingStatus: "ACTIVE",
      },
    });

    await tx.leadRoute.upsert({
      where: { zipCode: zip.zipCode },
      update: {
        clientId: actor.clientId,
        destinationEmail: client.leadRoutingEmail ?? "",
        destinationPhone: client.leadRoutingPhone ?? "",
        active: true,
      },
      create: {
        clientId: actor.clientId,
        zipCode: zip.zipCode,
        destinationEmail: client.leadRoutingEmail ?? "",
        destinationPhone: client.leadRoutingPhone ?? "",
        active: true,
      },
    });

    await audit(actor.userId, "zip.activated", "zip_inventory", zip.id, {
      zipCode: zip.zipCode,
    });
  });
}

export async function releaseZip(zipId: string, actorUserId: string) {
  const zip = await prisma.zipInventory.update({
    where: { id: zipId },
    data: {
      status: ZipStatus.AVAILABLE,
      assignedClientId: null,
      reservationExpiresAt: null,
      renewalDate: null,
    },
  });

  await prisma.leadRoute.updateMany({
    where: { zipCode: zip.zipCode },
    data: { active: false },
  });

  await audit(actorUserId, "zip.released", "zip_inventory", zip.id, {
    zipCode: zip.zipCode,
  });
}
