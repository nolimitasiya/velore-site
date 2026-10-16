import { SecurityAuditCategory } from "@prisma/client";

export type AuditSuppressionNotificationContent = {
  title: string;
  description: string;
};

export function getAuditSuppressionNotificationContent(
  category: SecurityAuditCategory | null | undefined,
): AuditSuppressionNotificationContent {
  const categoryLabel =
    category === SecurityAuditCategory.ADMIN
      ? "Admin authentication"
      : category === SecurityAuditCategory.BRAND
        ? "Brand authentication"
        : "Authentication";

  return {
    title: `Security monitoring: ${categoryLabel}`,
    description:
      `Some ${categoryLabel.toLowerCase()} audit events were suppressed ` +
      "after the audit ingestion limit was reached. " +
      "Review authentication activity and platform health.",
  };
}