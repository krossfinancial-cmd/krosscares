type Bucket = {
  count: number;
  resetAt: number;
};

import Redis from "ioredis";

const globalStore = globalThis as unknown as {
  __rate_limit_store?: Map<string, Bucket>;
  __rate_limit_redis?: Redis;
};

const store = globalStore.__rate_limit_store ?? new Map<string, Bucket>();
globalStore.__rate_limit_store = store;

function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (!globalStore.__rate_limit_redis) {
    globalStore.__rate_limit_redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    globalStore.__rate_limit_redis.connect().catch(() => null);
  }
  return globalStore.__rate_limit_redis;
}

export async function checkRateLimit(key: string, limit: number, windowMs: number) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.pexpire(key, windowMs);
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
      };
    } catch {
      // Fall through to in-memory limiter if Redis is unavailable.
    }
  }

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
