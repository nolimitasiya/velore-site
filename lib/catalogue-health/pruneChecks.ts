import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 90;

export async function pruneCatalogueHealthChecks(
  now = new Date()
) {
  const cutoff = new Date(now);

  cutoff.setUTCDate(
    cutoff.getUTCDate() - RETENTION_DAYS
  );

  const result =
    await prisma.catalogueHealthCheck.deleteMany({
      where: {
        checkedAt: {
          lt: cutoff,
        },
      },
    });

  return {
    retentionDays: RETENTION_DAYS,
    cutoff: cutoff.toISOString(),
    deletedChecks: result.count,
  };
}