import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  INTERNAL_CRON_SECRET: z.string().default("local-cron-secret"),
});

function normalize(value: string | undefined) {
  return typeof value === "string" ? value.replace(/\\n+$/g, "").trim() : value;
}

export const env = schema.parse({
  DATABASE_URL: normalize(process.env.DATABASE_URL),
  APP_URL: normalize(process.env.APP_URL),
  INTERNAL_CRON_SECRET: normalize(process.env.INTERNAL_CRON_SECRET),
});
