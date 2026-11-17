import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

vi.mock("./claimShopperMarketingSync", () => ({
  claimShopperMarketingSync: vi.fn(),
}));

vi.mock("./validateClaimedShopperMarketingSync", () => ({
  validateClaimedShopperMarketingSync: vi.fn(),
}));

vi.mock("./transitionShopperMarketingSync", () => ({
  transitionShopperMarketingSync: vi.fn(),
}));

vi.mock("./checkShopperMarketingProviderOrdering", () => ({
  checkShopperMarketingProviderOrdering: vi.fn(
    async () => ({ status: "CLEAR" as const })
  ),
}));

vi.mock("./releaseShopperMarketingSyncClaim", () => ({
  releaseShopperMarketingSyncClaim: vi.fn(),
}));

import { claimShopperMarketingSync } from "./claimShopperMarketingSync";
import { validateClaimedShopperMarketingSync } from "./validateClaimedShopperMarketingSync";
import { transitionShopperMarketingSync } from "./transitionShopperMarketingSync";
import { releaseShopperMarketingSyncClaim } from "./releaseShopperMarketingSyncClaim";
import { processOneShopperMarketingSync } from "./processShopperMarketingSync";

const claim = vi.mocked(claimShopperMarketingSync);
const validate = vi.mocked(validateClaimedShopperMarketingSync);
const transition = vi.mocked(transitionShopperMarketingSync);
const release = vi.mocked(releaseShopperMarketingSyncClaim);

const db = {} as PrismaClient;

const claimed = {
  id: "operation-1",
  shopperId: "shopper-1",
  email: "shopper@example.com",
  consentVersion: 3,
  desiredConsent: true,
  reason: "ACCOUNT_OPT_IN",
  claimToken: "token-1",
};

describe("shopper marketing consent worker lifecycle", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    claim.mockResolvedValue(claimed);
    validate.mockResolvedValue({
      status: "READY",
      reason: "CURRENT_CONSENT",
    });
    transition.mockResolvedValue(true);
    release.mockResolvedValue(true);
  });

  it("returns EMPTY when no operation is available", async () => {
    claim.mockResolvedValueOnce(null);

    expect(await processOneShopperMarketingSync(db))
      .toEqual({ status: "EMPTY" });

    expect(validate).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });

  it("releases a ready operation without provider submission", async () => {
    expect(await processOneShopperMarketingSync(db))
      .toEqual({ status: "READY_NOT_SUBMITTED" });

    expect(release).toHaveBeenCalledWith(
      db,
      "operation-1",
      "token-1"
    );

    expect(transition).not.toHaveBeenCalled();
  });

  it("reports a release conflict", async () => {
    release.mockResolvedValueOnce(false);

    expect(await processOneShopperMarketingSync(db))
      .toEqual({ status: "TRANSITION_CONFLICT" });
  });

  it("supersedes outdated operations", async () => {
    validate.mockResolvedValueOnce({
      status: "SUPERSEDED",
      reason: "OLDER_VERSION",
    });

    expect(await processOneShopperMarketingSync(db))
      .toEqual({ status: "SUPERSEDED" });

    expect(transition).toHaveBeenCalledWith(
      db,
      "operation-1",
      "token-1",
      { status: "SUPERSEDED" }
    );

    expect(release).not.toHaveBeenCalled();
  });

  it("reports superseded transition conflicts", async () => {
    validate.mockResolvedValueOnce({
      status: "SUPERSEDED",
      reason: "OLDER_VERSION",
    });
    transition.mockResolvedValueOnce(false);

    expect(await processOneShopperMarketingSync(db))
      .toEqual({ status: "TRANSITION_CONFLICT" });
  });

  it("quarantines blocked operations for manual review", async () => {
    validate.mockResolvedValueOnce({
      status: "BLOCKED",
      reason: "SHARED_EMAIL_REVIEW",
    });

    expect(await processOneShopperMarketingSync(db))
      .toEqual({
        status: "BLOCKED",
        reason: "SHARED_EMAIL_REVIEW",
      });

    expect(transition).toHaveBeenCalledWith(
      db,
      "operation-1",
      "token-1",
      {
        status: "UNKNOWN",
        error: "Manual review required: SHARED_EMAIL_REVIEW",
      }
    );

    expect(release).not.toHaveBeenCalled();
  });

  it("reports blocked transition conflicts", async () => {
    validate.mockResolvedValueOnce({
      status: "BLOCKED",
      reason: "UNVERIFIED_EMAIL",
    });
    transition.mockResolvedValueOnce(false);

    expect(await processOneShopperMarketingSync(db))
      .toEqual({ status: "TRANSITION_CONFLICT" });
  });

  it("does not transition an invalid claim", async () => {
    validate.mockResolvedValueOnce({
      status: "INVALID_CLAIM",
      reason: "TOKEN_MISMATCH",
    });

    expect(await processOneShopperMarketingSync(db))
      .toEqual({
        status: "INVALID_CLAIM",
        reason: "TOKEN_MISMATCH",
      });

    expect(transition).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });

  it("validates using the claimed operation and token", async () => {
    await processOneShopperMarketingSync(db);

    expect(validate).toHaveBeenCalledWith(
      db,
      "operation-1",
      "token-1"
    );
  });

  it("propagates claiming failures", async () => {
    claim.mockRejectedValueOnce(
      new Error("Simulated claim failure")
    );

    await expect(processOneShopperMarketingSync(db))
      .rejects.toThrow("Simulated claim failure");
  });

  it("propagates validation failures", async () => {
    validate.mockRejectedValueOnce(
      new Error("Simulated validation failure")
    );

    await expect(processOneShopperMarketingSync(db))
      .rejects.toThrow("Simulated validation failure");
  });
});
