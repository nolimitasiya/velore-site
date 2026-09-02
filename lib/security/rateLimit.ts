import { prisma } from "@/lib/prisma";

export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = new Date();

  const existing = await prisma.rateLimit.findUnique({
    where: { key },
  });

  /*
   * No record yet, or the old window expired.
   * Start a fresh window.
   */
  if (!existing || existing.resetAt <= now) {
    const resetAt = new Date(now.getTime() + windowMs);

    await prisma.rateLimit.upsert({
      where: { key },
      create: {
        key,
        count: 1,
        resetAt,
      },
      update: {
        count: 1,
        resetAt,
      },
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
    };
  }

  /*
   * Current rate-limit window is still active.
   */
  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  const updated = await prisma.rateLimit.update({
    where: { key },
    data: {
      count: {
        increment: 1,
      },
    },
  });

  return {
    allowed: true,
    remaining: Math.max(0, limit - updated.count),
    resetAt: updated.resetAt,
  };
}