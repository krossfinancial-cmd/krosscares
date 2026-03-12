import { Prisma } from "@prisma/client";

const RECOVERABLE_PRISMA_ERROR_CODES = new Set([
  "P1001",
  "P2021",
  "P2022",
  "P2024",
]);

export function isDatabaseUnavailableError(error: unknown) {
  if (!(error instanceof Error)) return false;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RECOVERABLE_PRISMA_ERROR_CODES.has(error.code);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return /can't reach database server/i.test(error.message) || /\bP1001\b/i.test(error.message);
  }

  return (
    /can't reach database server/i.test(error.message) ||
    /\bP1001\b/i.test(error.message) ||
    /does not exist in the current database/i.test(error.message) ||
    /relation .* does not exist/i.test(error.message) ||
    /column .* does not exist/i.test(error.message)
  );
}
