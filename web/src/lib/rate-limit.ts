type Bucket = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as unknown as {
  __rate_limit_store?: Map<string, Bucket>;
};

const store = globalStore.__rate_limit_store ?? new Map<string, Bucket>();
globalStore.__rate_limit_store = store;

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  store.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.count };
}

export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  return `${ip}:${ua.slice(0, 32)}`;
}
