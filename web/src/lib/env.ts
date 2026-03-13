import { z } from "zod";

export const isProduction = process.env.NODE_ENV === "production";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url(),
  INTERNAL_CRON_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  BACKEND_API_SHARED_SECRET: z.string().min(1).optional(),
});

function normalize(value: string | undefined) {
  if (typeof value !== "string") return value;
  const trimmed = value.replace(/\\n+$/g, "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getNormalizedEnv(name: string) {
  return normalize(process.env[name]);
}

export function requireConfiguredInProduction(name: string, value: string | undefined) {
  if (isProduction) {
    return required(name, value);
  }

  return value;
}

export const env = schema.parse({
  DATABASE_URL: required("DATABASE_URL", normalize(process.env.DATABASE_URL)),
  APP_URL: required("APP_URL", normalize(process.env.APP_URL) ?? (isProduction ? undefined : "http://localhost:3000")),
  INTERNAL_CRON_SECRET: required(
    "INTERNAL_CRON_SECRET",
    normalize(process.env.INTERNAL_CRON_SECRET) ?? (isProduction ? undefined : "local-cron-secret"),
  ),
  STRIPE_SECRET_KEY: normalize(process.env.STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: normalize(process.env.STRIPE_WEBHOOK_SECRET),
  SMTP_HOST: normalize(process.env.SMTP_HOST),
  SMTP_USER: normalize(process.env.SMTP_USER),
  SMTP_PASS: normalize(process.env.SMTP_PASS),
  BACKEND_API_SHARED_SECRET: normalize(process.env.BACKEND_API_SHARED_SECRET),
});
