import { createHash, randomBytes } from "crypto";
import { addHours } from "date-fns";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function issuePasswordSetupToken(userId: string, expiresInHours = 72) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = addHours(new Date(), expiresInHours);

  await prisma.passwordSetupToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token: rawToken,
    expiresAt,
  };
}

export async function getValidPasswordSetupToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  return prisma.passwordSetupToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });
}

export async function setPasswordFromToken(rawToken: string, password: string) {
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    const token = await tx.passwordSetupToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: true,
      },
    });

    if (!token) {
      return null;
    }

    await tx.user.update({
      where: { id: token.userId },
      data: {
        passwordHash,
      },
    });

    await tx.passwordSetupToken.updateMany({
      where: {
        userId: token.userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    return token.user;
  });
}
