import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getOptionalSupabasePublicClientConfig, warnMissingSupabasePublicClientConfig } from "@/lib/supabase/config";

export async function createOptionalServerSupabaseClient() {
  const config = getOptionalSupabasePublicClientConfig();

  if (!config) {
    warnMissingSupabasePublicClientConfig("Skipping Supabase server client setup");
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. Route handlers and proxy can.
        }
      },
    },
  });
}

export async function createServerSupabaseClient() {
  const client = await createOptionalServerSupabaseClient();

  if (!client) {
    throw new Error("Supabase public client env is not configured.");
  }

  return client;
}
