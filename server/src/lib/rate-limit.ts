interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, number[]>();
  return {
    check(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
      const now = Date.now();
      const cutoff = now - options.windowMs;
      const timestamps = (buckets.get(key) ?? []).filter(t => t > cutoff);
      if (timestamps.length >= options.limit) {
        buckets.set(key, timestamps);
        const retryAfterSec = Math.max(1, Math.ceil((timestamps[0]! + options.windowMs - now) / 1000));
        return { ok: false, retryAfterSec };
      }
      timestamps.push(now);
      buckets.set(key, timestamps);
      return { ok: true };
    },
  };
}
