import { prisma } from "@/lib/prisma";

export async function rateLimit(opts: {
  key: string;         // e.g. "admin_forgot:1.2.3.4"
  limit: number;       // e.g. 5
  windowMs: number;    // e.g. 15*60*1000
}) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + opts.windowMs);

  const row = await prisma.rateLimit.upsert({
    where: { key: opts.key },
    create: { key: opts.key, count: 1, resetAt },
    update: {},
    select: { count: true, resetAt: true },
  });

  // If window expired, reset counter
  if (row.resetAt < now) {
    await prisma.rateLimit.update({
      where: { key: opts.key },
      data: { count: 1, resetAt },
    });
    return { ok: true, remaining: opts.limit - 1 };
  }

  // Increment if within window
  const updated = await prisma.rateLimit.update({
    where: { key: opts.key },
    data: { count: { increment: 1 } },
    select: { count: true, resetAt: true },
  });

  const remaining = Math.max(opts.limit - updated.count, 0);
  const ok = updated.count <= opts.limit;

  return { ok, remaining, resetAt: updated.resetAt };
}
