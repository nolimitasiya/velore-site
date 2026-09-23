import {
  AdminNotificationType,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type PlatformIncidentNotificationKind =
  | "OPENED"
  | "ESCALATED"
  | "RECOVERED";

type CreateNotificationOptions = {
  incidentId: string;
  kind: PlatformIncidentNotificationKind;
};

const NOTIFICATION_TYPE = {
  OPENED:
    AdminNotificationType.PLATFORM_INCIDENT_OPENED,

  ESCALATED:
    AdminNotificationType.PLATFORM_INCIDENT_ESCALATED,

  RECOVERED:
    AdminNotificationType.PLATFORM_INCIDENT_RECOVERED,
} satisfies Record<
  PlatformIncidentNotificationKind,
  AdminNotificationType
>;

type TransactionClient =
  Prisma.TransactionClient;

export async function createPlatformIncidentNotification(
  options: CreateNotificationOptions,
  tx: TransactionClient = prisma
) {
  return tx.adminNotification.create({
    data: {
      type:
        NOTIFICATION_TYPE[options.kind],

      platformIncidentId:
        options.incidentId,
    },
  });
}