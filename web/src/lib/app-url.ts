import { env } from "@/lib/env";

export function appUrl(path: string) {
  return new URL(path, env.APP_URL);
}
