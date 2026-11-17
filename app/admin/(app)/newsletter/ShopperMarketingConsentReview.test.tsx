import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import ShopperMarketingConsentReview from "./ShopperMarketingConsentReview";

type Operation =
  ComponentProps<typeof ShopperMarketingConsentReview>["operations"][number];

function makeOperation(
  overrides: Partial<Operation> = {}
): Operation {
  return {
    id: "operation-1",
    email: "shopper@example.com",
    desiredConsent: true,
    reason: "ACCOUNT_OPT_IN",
    status: "UNKNOWN",
    consentVersion: 1,
    providerJobId: null,
    lastError: "MISSING_PROVIDER_JOB_ID",
    createdAt: new Date("2026-11-16T12:00:00Z"),
    submittedAt: null,
    lastCheckedAt: null,
    ...overrides,
  };
}

describe("ShopperMarketingConsentReview", () => {
  it("shows an empty state", () => {
    const html = renderToStaticMarkup(
      <ShopperMarketingConsentReview operations={[]} />
    );

    expect(html).toContain(
      "No unresolved shopper marketing operations"
    );
  });

  it("displays an unresolved subscription", () => {
    const html = renderToStaticMarkup(
      <ShopperMarketingConsentReview
        operations={[makeOperation()]}
      />
    );

    expect(html).toContain("shopper@example.com");
    expect(html).toContain("Subscribe");
    expect(html).toContain("UNKNOWN");
    expect(html).toContain("MISSING_PROVIDER_JOB_ID");
  });

  it("displays an unsubscribe operation", () => {
    const html = renderToStaticMarkup(
      <ShopperMarketingConsentReview
        operations={[
          makeOperation({
            desiredConsent: false,
            status: "FAILED",
          }),
        ]}
      />
    );

    expect(html).toContain("Unsubscribe");
    expect(html).toContain("FAILED");
  });

  it("does not expose retry or mutation controls", () => {
    const html = renderToStaticMarkup(
      <ShopperMarketingConsentReview
        operations={[makeOperation()]}
      />
    );

    expect(html).not.toMatch(/<button\b/i);
    expect(html).not.toMatch(/<form\b/i);
    expect(html).not.toMatch(/<input\b/i);
  });
});