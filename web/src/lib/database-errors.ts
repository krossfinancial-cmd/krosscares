export function isDatabaseUnavailableError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return /can't reach database server/i.test(error.message) || /\bP1001\b/i.test(error.message);
}
