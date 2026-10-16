import "server-only";

import { prisma } from "@/lib/prisma";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: Date;
};

export async function rateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  if (
    !opts.key ||
    !Number.isInteger(opts.limit) ||
    opts.limit < 1 ||
    !Number.isFinite(opts.windowMs) ||
    opts.windowMs <= 0
  ) {
    throw new Error("Invalid rate limit configuration");
  }

  const now = new Date();
  const resetAt = new Date(now.getTime() + opts.windowMs);

  /*
   * PostgreSQL advisory lock:
   * Serialize updates for the same rate-limit key.
   *
   * The lock is transaction-scoped and automatically released
   * when the transaction commits or rolls back.
   */
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${opts.key}, 0))::text
      `;

    const existing = await tx.rateLimit.findUnique({
      where: { key: opts.key },
      select: {
        count: true,
        resetAt: true,
      },
    });

    if (!existing) {
      await tx.rateLimit.create({
        data: {
          key: opts.key,
          count: 1,
          resetAt,
        },
      });

      return {
        ok: true,
        remaining: opts.limit - 1,
        resetAt,
      };
    }

    if (existing.resetAt <= now) {
      await tx.rateLimit.update({
        where: { key: opts.key },
        data: {
          count: 1,
          resetAt,
        },
      });

      return {
        ok: true,
        remaining: opts.limit - 1,
        resetAt,
      };
    }

    // The account has already exceeded its allowance.
    // Preserve the existing window without increasing the counter.
    if (existing.count >= opts.limit) {
      return {
        ok: false,
        remaining: 0,
        resetAt: existing.resetAt,
      };
    }

    const updated = await tx.rateLimit.update({
      where: { key: opts.key },
      data: {
        count: { increment: 1 },
      },
      select: {
        count: true,
        resetAt: true,
      },
    });

    return {
      ok: updated.count <= opts.limit,
      remaining: Math.max(opts.limit - updated.count, 0),
      resetAt: updated.resetAt,
    };
  });
}
