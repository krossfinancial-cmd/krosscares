const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BACKEND_API_SECRET = process.env.BACKEND_API_SHARED_SECRET;

function backendUrl() {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }
  return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/backend-api`;
}

export async function callBackendApi<T = unknown>(action: string, payload: Record<string, unknown> = {}) {
  if (!BACKEND_API_SECRET) {
    throw new Error("BACKEND_API_SHARED_SECRET is not configured.");
  }

  const response = await fetch(backendUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-backend-secret": BACKEND_API_SECRET,
    },
    body: JSON.stringify({ action, payload }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Backend API call failed (${response.status}).`;
    throw new Error(message);
  }

  return data as T;
}
