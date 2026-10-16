import { describe, expect, it } from "vitest";
import { SecurityAuditCategory } from "@prisma/client";

import { getAuditSuppressionNotificationContent } from "./auditSuppressionNotificationContent";

describe("getAuditSuppressionNotificationContent", () => {
  it("identifies Admin authentication incidents", () => {
    const content = getAuditSuppressionNotificationContent(
      SecurityAuditCategory.ADMIN,
    );

    expect(content.title).toBe(
      "Security monitoring: Admin authentication",
    );

    expect(content.description).toContain(
      "admin authentication audit events were suppressed",
    );
  });

  it("identifies Brand authentication incidents", () => {
    const content = getAuditSuppressionNotificationContent(
      SecurityAuditCategory.BRAND,
    );

    expect(content.title).toBe(
      "Security monitoring: Brand authentication",
    );

    expect(content.description).toContain(
      "brand authentication audit events were suppressed",
    );
  });

  it("uses a generic fallback for a missing category", () => {
    const content = getAuditSuppressionNotificationContent(null);

    expect(content.title).toBe(
      "Security monitoring: Authentication",
    );

    expect(content.description).toContain(
      "authentication audit events were suppressed",
    );
  });

  it("uses the fallback when the category is undefined", () => {
    const content = getAuditSuppressionNotificationContent(undefined);

    expect(content.title).toBe(
      "Security monitoring: Authentication",
    );
  });

  it("does not suggest that authentication requests were blocked", () => {
    const content = getAuditSuppressionNotificationContent(
      SecurityAuditCategory.ADMIN,
    );

    expect(content.description).not.toMatch(
      /login requests? (were|was) blocked/i,
    );
  });
});