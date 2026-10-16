import "server-only";

import { rateLimit } from "@/lib/rateLimit";

type CheckRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type CheckRateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

/**
 * Compatibility wrapper for analytics rate limiting.
 *
 * Uses the shared PostgreSQL-backed rate limiter so concurrent
 * requests cannot bypass limits through non-atomic read/update.
 */
export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: CheckRateLimitOptions): Promise<CheckRateLimitResult> {
  const result = await rateLimit({
    key,
    limit,
    windowMs,
  });

  return {
    allowed: result.ok,
    remaining: result.remaining,
    resetAt: result.resetAt,
  };
}