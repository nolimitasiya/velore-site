import { describe, expect, it } from "vitest";

import {
  classifyStaleShopperMarketingClaim,
  type StaleClaimInput,
} from "./classifyStaleShopperMarketingClaim";

const now = new Date("2026-11-12T12:00:00.000Z");

const base: StaleClaimInput = {
  status: "PROCESSING",
  claimedAt: new Date("2026-11-12T11:50:00.000Z"),
  submittedAt: null,
  providerJobId: null,
  lastCheckedAt: null,
};

const classify = (
  overrides: Partial<StaleClaimInput> = {},
  timeoutMs = 300000
) =>
  classifyStaleShopperMarketingClaim(
    { ...base, ...overrides },
    now,
    timeoutMs
  );

describe("stale shopper marketing claim classification", () => {
  it("ignores operations outside PROCESSING", () => {
    expect(classify({ status: "PENDING" }).status)
      .toBe("NOT_PROCESSING");
  });

  it("rejects missing claim timestamps", () => {
    expect(classify({ claimedAt: null }).status)
      .toBe("INVALID_CLAIM_TIMESTAMP");
  });

  it("rejects future claim timestamps", () => {
    expect(
      classify({
        claimedAt: new Date("2026-11-12T12:01:00.000Z"),
      }).status
    ).toBe("INVALID_CLAIM_TIMESTAMP");
  });

  it("rejects invalid timeouts", () => {
    expect(classify({}, 0).status)
      .toBe("INVALID_CLAIM_TIMESTAMP");
  });

  it("keeps recent claims active", () => {
    expect(
      classify({
        claimedAt: new Date("2026-11-12T11:59:00.000Z"),
      }).status
    ).toBe("ACTIVE");
  });

  it("classifies expired claims without provider metadata", () => {
    expect(classify().status)
      .toBe("STALE_UNSUBMITTED");
  });

  it("treats known provider jobs as uncertain", () => {
    expect(
      classify({ providerJobId: "job-123" }).status
    ).toBe("STALE_PROVIDER_OUTCOME_UNKNOWN");
  });

  it("treats submission timestamps as uncertain", () => {
    expect(
      classify({ submittedAt: now }).status
    ).toBe("STALE_PROVIDER_OUTCOME_UNKNOWN");
  });

  it("treats provider checks as uncertain", () => {
    expect(
      classify({ lastCheckedAt: now }).status
    ).toBe("STALE_PROVIDER_OUTCOME_UNKNOWN");
  });

  it("treats the exact timeout boundary as stale", () => {
    expect(
      classify({
        claimedAt: new Date("2026-11-12T11:55:00.000Z"),
      }).status
    ).toBe("STALE_UNSUBMITTED");
  });
});
