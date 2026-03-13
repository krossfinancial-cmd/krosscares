function normalize(value: string | undefined) {
  return typeof value === "string" ? value.replace(/\n+$/g, "").trim() : "";
}

function required(name: string, value: string) {
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getSupabaseUrl() {
  return required("NEXT_PUBLIC_SUPABASE_URL", normalize(process.env.NEXT_PUBLIC_SUPABASE_URL));
}

export function getSupabasePublishableKey() {
  const publishableKey = normalize(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const anonKey = normalize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    publishableKey || anonKey,
  );
}

export function getSupabaseServiceRoleKey() {
  return required("SUPABASE_SERVICE_ROLE_KEY", normalize(process.env.SUPABASE_SERVICE_ROLE_KEY));
}
