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
  return prisma.$transaction(async (tx) => {
    const claimResult = await tx.zipInventory.updateMany({
      where: {
        id: zipId,
        OR: [
          { status: ZipStatus.AVAILABLE },
          {
            status: ZipStatus.RESERVED,
            reservationExpiresAt: {
              lt: new Date(),
            },
          },
          {
            status: ZipStatus.RESERVED,
            assignedClientId: actor.clientId,
          },
        ],
      },
      data: {
        status: ZipStatus.RESERVED,
        assignedClientId: actor.clientId,
        reservationExpiresAt: null,
      },
    });
    if (claimResult.count === 0) throw new Error("ZIP is currently unavailable.");

    const updated = await tx.zipInventory.findUnique({
      where: { id: zipId },
    });
    if (!updated) throw new Error("ZIP not found.");

    await audit(actor.userId, "zip.reserved", "zip_inventory", updated.id, {
      zipCode: updated.zipCode,
      contactWindowHours: 24,
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
    if (zip.reservationExpiresAt && zip.reservationExpiresAt <= new Date()) {
      await tx.zipInventory.update({
        where: { id: zip.id },
        data: {
          status: ZipStatus.AVAILABLE,
          assignedClientId: null,
          reservationExpiresAt: null,
        },
      });
      throw new Error("Reservation expired. Reclaim this ZIP to continue checkout.");
    }

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

    await tx.zipInventory.update({
      where: { id: zipId },
      data: {
        reservationExpiresAt: null,
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
      where: {
        zipCode_vertical: {
          zipCode: zip.zipCode,
          vertical: zip.vertical,
        },
      },
      update: {
        clientId: actor.clientId,
        vertical: zip.vertical,
        destinationEmail: client.leadRoutingEmail ?? "",
        destinationPhone: client.leadRoutingPhone ?? "",
        active: true,
      },
      create: {
        clientId: actor.clientId,
        zipCode: zip.zipCode,
        vertical: zip.vertical,
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
    where: { zipCode: zip.zipCode, vertical: zip.vertical },
    data: { active: false },
  });

  await audit(actorUserId, "zip.released", "zip_inventory", zip.id, {
    zipCode: zip.zipCode,
  });
}

export async function assignZipToClientAdmin(zipId: string, clientId: string, actorUserId: string) {
  const now = new Date();
  const renewalDate = addDays(now, 365);

  await prisma.$transaction(async (tx) => {
    const zip = await tx.zipInventory.findUnique({
      where: { id: zipId },
    });
    if (!zip) throw new Error("ZIP not found.");
    if (zip.status === ZipStatus.BLOCKED) throw new Error("ZIP is blocked.");
    if (zip.status === ZipStatus.SOLD && zip.assignedClientId && zip.assignedClientId !== clientId) {
      throw new Error("ZIP is already sold.");
    }
    if (zip.status === ZipStatus.RESERVED && zip.assignedClientId && zip.assignedClientId !== clientId) {
      throw new Error("ZIP is currently reserved by another client.");
    }

    const client = await tx.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    });
    if (!client) throw new Error("Client not found.");
    if (client.vertical !== zip.vertical) throw new Error("Client vertical must match ZIP vertical.");

    await tx.zipInventory.update({
      where: { id: zipId },
      data: {
        status: ZipStatus.SOLD,
        assignedClientId: clientId,
        reservationExpiresAt: null,
        renewalDate,
      },
    });

    const paidPayment = await tx.payment.findFirst({
      where: {
        clientId,
        zipId,
        status: PaymentStatus.PAID,
      },
    });
    if (!paidPayment) {
      const pendingPayment = await tx.payment.findFirst({
        where: {
          clientId,
          zipId,
          status: PaymentStatus.PENDING,
        },
      });
      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: now,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            clientId,
            zipId,
            provider: "admin_manual",
            status: PaymentStatus.PAID,
            amountCents: zip.annualPriceCents,
            paidAt: now,
          },
        });
      }
    }

    const signedContract = await tx.contract.findFirst({
      where: {
        clientId,
        zipId,
        status: ContractStatus.SIGNED,
      },
    });
    if (!signedContract) {
      const existingContract = await tx.contract.findFirst({
        where: {
          clientId,
          zipId,
        },
      });
      if (existingContract) {
        await tx.contract.update({
          where: { id: existingContract.id },
          data: {
            status: ContractStatus.SIGNED,
            sentAt: existingContract.sentAt ?? now,
            signedAt: now,
            documentUrl: existingContract.documentUrl ?? "https://example.local/contracts/admin-assigned.pdf",
          },
        });
      } else {
        await tx.contract.create({
          data: {
            clientId,
            zipId,
            status: ContractStatus.SIGNED,
            sentAt: now,
            signedAt: now,
            documentUrl: "https://example.local/contracts/admin-assigned.pdf",
          },
        });
      }
    }

    await tx.onboardingForm.upsert({
      where: {
        clientId_zipId: {
          clientId,
          zipId,
        },
      },
      update: {
        status: OnboardingFormStatus.COMPLETED,
        submittedAt: now,
      },
      create: {
        clientId,
        zipId,
        status: OnboardingFormStatus.COMPLETED,
        submittedAt: now,
      },
    });

    await tx.client.update({
      where: { id: clientId },
      data: {
        onboardingStatus: "ACTIVE",
        leadRoutingEmail: client.leadRoutingEmail ?? client.user.email,
        leadRoutingPhone: client.leadRoutingPhone ?? client.user.phone ?? "",
        preferredContactMethod: client.preferredContactMethod ?? "EMAIL",
      },
    });

    await tx.leadRoute.upsert({
      where: {
        zipCode_vertical: {
          zipCode: zip.zipCode,
          vertical: zip.vertical,
        },
      },
      update: {
        clientId,
        destinationEmail: client.leadRoutingEmail ?? client.user.email,
        destinationPhone: client.leadRoutingPhone ?? client.user.phone ?? "",
        active: true,
      },
      create: {
        clientId,
        zipCode: zip.zipCode,
        vertical: zip.vertical,
        destinationEmail: client.leadRoutingEmail ?? client.user.email,
        destinationPhone: client.leadRoutingPhone ?? client.user.phone ?? "",
        active: true,
      },
    });

    await audit(actorUserId, "zip.assigned_admin", "zip_inventory", zipId, {
      zipCode: zip.zipCode,
      clientId,
    });
  });
}

export async function reassignZipToClientAdmin(zipId: string, clientId: string, actorUserId: string) {
  const now = new Date();
  const renewalDate = addDays(now, 365);

  await prisma.$transaction(async (tx) => {
    const zip = await tx.zipInventory.findUnique({
      where: { id: zipId },
    });
    if (!zip) throw new Error("ZIP not found.");
    if (zip.status === ZipStatus.BLOCKED) throw new Error("ZIP is blocked.");

    const client = await tx.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    });
    if (!client) throw new Error("Client not found.");
    if (client.vertical !== zip.vertical) throw new Error("Client vertical must match ZIP vertical.");

    const priorClientId = zip.assignedClientId;
    const isSameClient = priorClientId === clientId;

    await tx.zipInventory.update({
      where: { id: zipId },
      data: {
        status: ZipStatus.SOLD,
        assignedClientId: clientId,
        reservationExpiresAt: null,
        renewalDate,
      },
    });

    const paidPayment = await tx.payment.findFirst({
      where: {
        clientId,
        zipId,
        status: PaymentStatus.PAID,
      },
    });
    if (!paidPayment) {
      const pendingPayment = await tx.payment.findFirst({
        where: {
          clientId,
          zipId,
          status: PaymentStatus.PENDING,
        },
      });
      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: now,
            provider: pendingPayment.provider || "admin_reassign",
          },
        });
      } else {
        await tx.payment.create({
          data: {
            clientId,
            zipId,
            provider: "admin_reassign",
            status: PaymentStatus.PAID,
            amountCents: zip.annualPriceCents,
            paidAt: now,
          },
        });
      }
    }

    const signedContract = await tx.contract.findFirst({
      where: {
        clientId,
        zipId,
        status: ContractStatus.SIGNED,
      },
    });
    if (!signedContract) {
      const existingContract = await tx.contract.findFirst({
        where: {
          clientId,
          zipId,
        },
      });
      if (existingContract) {
        await tx.contract.update({
          where: { id: existingContract.id },
          data: {
            status: ContractStatus.SIGNED,
            sentAt: existingContract.sentAt ?? now,
            signedAt: now,
            documentUrl: existingContract.documentUrl ?? "https://example.local/contracts/admin-reassigned.pdf",
          },
        });
      } else {
        await tx.contract.create({
          data: {
            clientId,
            zipId,
            status: ContractStatus.SIGNED,
            sentAt: now,
            signedAt: now,
            documentUrl: "https://example.local/contracts/admin-reassigned.pdf",
          },
        });
      }
    }

    await tx.onboardingForm.upsert({
      where: {
        clientId_zipId: {
          clientId,
          zipId,
        },
      },
      update: {
        status: OnboardingFormStatus.COMPLETED,
        submittedAt: now,
      },
      create: {
        clientId,
        zipId,
        status: OnboardingFormStatus.COMPLETED,
        submittedAt: now,
      },
    });

    await tx.client.update({
      where: { id: clientId },
      data: {
        onboardingStatus: "ACTIVE",
        leadRoutingEmail: client.leadRoutingEmail ?? client.user.email,
        leadRoutingPhone: client.leadRoutingPhone ?? client.user.phone ?? "",
        preferredContactMethod: client.preferredContactMethod ?? "EMAIL",
      },
    });

    await tx.leadRoute.upsert({
      where: {
        zipCode_vertical: {
          zipCode: zip.zipCode,
          vertical: zip.vertical,
        },
      },
      update: {
        clientId,
        destinationEmail: client.leadRoutingEmail ?? client.user.email,
        destinationPhone: client.leadRoutingPhone ?? client.user.phone ?? "",
        active: true,
      },
      create: {
        clientId,
        zipCode: zip.zipCode,
        vertical: zip.vertical,
        destinationEmail: client.leadRoutingEmail ?? client.user.email,
        destinationPhone: client.leadRoutingPhone ?? client.user.phone ?? "",
        active: true,
      },
    });

    await audit(actorUserId, "zip.reassigned_admin", "zip_inventory", zipId, {
      zipCode: zip.zipCode,
      fromClientId: priorClientId,
      toClientId: clientId,
      noOpSameClient: isSameClient,
    });
  });
}
