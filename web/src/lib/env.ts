import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(8).default("local-dev-secret"),
  INTERNAL_CRON_SECRET: z.string().default("local-cron-secret"),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  INTERNAL_CRON_SECRET: process.env.INTERNAL_CRON_SECRET,
});
