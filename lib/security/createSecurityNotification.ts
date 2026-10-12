import "server-only";

import {
  AdminNotificationType,
  SecurityEventType,
  type Prisma,
} from "@prisma/client";

type SecurityNotificationDb = {
  adminNotification: {
    create: Prisma.TransactionClient["adminNotification"]["create"];
  };
};

type CreateSecurityNotificationInput = {
  securityEventId: string;
  securityEventType: SecurityEventType;
};

/**
 * Creates an administrator notification for a security event.
 *
 * Call this only when the associated security event
 * has been newly created.
 *
 * The database's unique securityEventId constraint
 * prevents duplicate notifications for the same event.
 */
export async function createSecurityNotification(
  input: CreateSecurityNotificationInput,
  db: SecurityNotificationDb,
) {
  if (input.securityEventType !== SecurityEventType.ADMIN_LOGIN_RATE_LIMITED) {
    return null;
  }

  return db.adminNotification.create({
    data: {
      type: AdminNotificationType.SECURITY_ADMIN_LOGIN_RATE_LIMITED,
      securityEventId: input.securityEventId,
    },
  });
}
