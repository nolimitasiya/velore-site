import { prisma } from "@/lib/prisma";

import {
  PLATFORM_HEALTH_CHECKS,
} from "@/lib/platform-health/checkRegistry";

export async function syncPlatformHealthChecks() {
  const configuredKeys =
    PLATFORM_HEALTH_CHECKS.map(
      (definition) => definition.checkKey
    );

  const synced = [];

  for (const definition of PLATFORM_HEALTH_CHECKS) {
    const check =
      await prisma.platformHealthCheck.upsert({
        where: {
          checkKey: definition.checkKey,
        },

create: {
  checkKey:
    definition.checkKey,
  name:
    definition.name,
  description:
    definition.description,
  checkType:
    definition.checkType,
  path:
    definition.path,
  httpMethod:
    definition.httpMethod,
  intervalSeconds:
    definition.intervalSeconds,
  timeoutMs:
    definition.timeoutMs,
  staleAfterSeconds:
    definition.staleAfterSeconds,
  failureThreshold:
    definition.failureThreshold,
  recoveryThreshold:
    definition.recoveryThreshold,
  isActive: true,
  nextCheckAt: new Date(),
},

        update: {
          name: definition.name,
          description: definition.description,
          checkType: definition.checkType,
          path: definition.path,
          httpMethod: definition.httpMethod,
          intervalSeconds:
            definition.intervalSeconds,
          timeoutMs: definition.timeoutMs,
          staleAfterSeconds:
            definition.staleAfterSeconds,
          failureThreshold:
            definition.failureThreshold,
          recoveryThreshold:
            definition.recoveryThreshold,
          isActive: true,
        },
      });

    synced.push(check);
  }

  /*
   * Checks removed from the code registry are
   * retired rather than deleted so historical
   * measurements and incidents remain intact.
   */
  const retired =
    await prisma.platformHealthCheck.updateMany({
      where: {
        checkKey: {
          notIn: configuredKeys,
        },
        isActive: true,
      },
      data: {
        isActive: false,
        nextCheckAt: null,
      },
    });

  return {
    configured: PLATFORM_HEALTH_CHECKS.length,
    synced: synced.length,
    retired: retired.count,
  };
}