type RateBucket = { count: number; resetAt: number };

const buckets = new Map<string, RateBucket>();

export class AssistantRateLimit {
  public static check(userId: string, limitPerMinute = 24): boolean {
    const now = Date.now();
    const key = userId;
    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (existing.count >= limitPerMinute) {
      return false;
    }
    existing.count += 1;
    return true;
  }
}
