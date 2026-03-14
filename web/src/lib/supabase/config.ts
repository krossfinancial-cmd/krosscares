function normalize(value: string | undefined) {
  return typeof value === "string" ? value.replace(/\n+$/g, "").trim() : "";
}

type SupabasePublicClientConfig = {
  publishableKey: string;
  url: string;
};

let hasWarnedMissingPublicClientConfig = false;

function required(name: string, value: string) {
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getOptionalSupabasePublicClientConfig(): SupabasePublicClientConfig | null {
  const url = normalize(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = normalize(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || normalize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !publishableKey) {
    return null;
  }

  return {
    url,
    publishableKey,
  };
}

export function hasSupabasePublicClientConfig() {
  return getOptionalSupabasePublicClientConfig() !== null;
}

export function hasSupabaseAdminClientConfig() {
  return Boolean(normalize(process.env.NEXT_PUBLIC_SUPABASE_URL) && normalize(process.env.SUPABASE_SERVICE_ROLE_KEY));
}

export function getSupabaseAuthConfigStatus() {
  const hasPublicClient = hasSupabasePublicClientConfig();
  const hasAdminClient = hasSupabaseAdminClientConfig();

  return {
    hasPublicClient,
    hasAdminClient,
    canSignIn: hasPublicClient,
    canSignUp: hasPublicClient && hasAdminClient,
  };
}

export function warnMissingSupabasePublicClientConfig(context: string) {
  if (hasWarnedMissingPublicClientConfig) {
    return;
  }

  hasWarnedMissingPublicClientConfig = true;
  console.error(
    `${context}: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
  );
}

export function getSupabaseUrl() {
  return required("NEXT_PUBLIC_SUPABASE_URL", getOptionalSupabasePublicClientConfig()?.url || "");
}

export function getSupabasePublishableKey() {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    getOptionalSupabasePublicClientConfig()?.publishableKey || "",
  );
}

export function getSupabaseServiceRoleKey() {
  return required("SUPABASE_SERVICE_ROLE_KEY", normalize(process.env.SUPABASE_SERVICE_ROLE_KEY));
}
