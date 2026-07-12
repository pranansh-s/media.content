interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, number[]>();
  let lastSweep = Date.now();

  function sweep(now: number, cutoff: number) {
    if (now - lastSweep < options.windowMs) return;
    lastSweep = now;
    for (const [key, timestamps] of buckets) {
      if (!timestamps.some(t => t > cutoff)) buckets.delete(key);
    }
  }

  return {
    check(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
      const now = Date.now();
      const cutoff = now - options.windowMs;
      sweep(now, cutoff);
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
    size(): number {
      return buckets.size;
    },
  };
}
