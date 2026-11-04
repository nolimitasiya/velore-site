import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feedbackSubmission: {
      updateMany: mocks.updateMany,
    },
  },
}));

import {
  recoverFeedbackEmailClaims,
} from "@/lib/feedback/recoverFeedbackEmailClaims";

import {
  FEEDBACK_EMAIL_LEASE_MS,
  FEEDBACK_EMAIL_MAX_ATTEMPTS,
} from "@/lib/feedback/feedbackEmailRetry";

describe("feedback email claim recovery", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.updateMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });
  });

  it("recovers expired Admin claims that exhausted retries", async () => {
    await recoverFeedbackEmailClaims();

    const adminCall =
      mocks.updateMany.mock.calls[0][0];

    expect(adminCall.where.adminEmailStatus).toBe(
      "PROCESSING"
    );

    expect(adminCall.where.adminEmailAttempts).toEqual({
      gte: FEEDBACK_EMAIL_MAX_ATTEMPTS,
    });

    expect(
      adminCall.where.adminEmailClaimedAt.lte
    ).toBeInstanceOf(Date);

    expect(adminCall.data).toEqual({
      adminEmailStatus: "FAILED",
      adminEmailClaimedAt: null,
      adminEmailNextAttemptAt: null,
    });
  });

  it("uses the configured lease duration", async () => {
    const before = Date.now();

    await recoverFeedbackEmailClaims();

    const after = Date.now();

    const adminCall =
      mocks.updateMany.mock.calls[0][0];

    const expiry =
      adminCall.where.adminEmailClaimedAt.lte.getTime();

    expect(expiry).toBeGreaterThanOrEqual(
      before - FEEDBACK_EMAIL_LEASE_MS
    );

    expect(expiry).toBeLessThanOrEqual(
      after - FEEDBACK_EMAIL_LEASE_MS
    );
  });

  it("recovers exhausted historical shopper claims without sending email", async () => {
    await recoverFeedbackEmailClaims();

    const shopperCall =
      mocks.updateMany.mock.calls[1][0];

    expect(shopperCall.where.shopperEmailStatus).toBe(
      "PROCESSING"
    );

    expect(
      shopperCall.where.shopperEmailAttempts
    ).toEqual({
      gte: FEEDBACK_EMAIL_MAX_ATTEMPTS,
    });

    expect(shopperCall.data).toEqual({
      shopperEmailStatus: "FAILED",
      shopperEmailClaimedAt: null,
      shopperEmailNextAttemptAt: null,
    });
  });

  it("returns the recovered counts for both recipient types", async () => {
    const result = await recoverFeedbackEmailClaims();

    expect(result).toEqual({
      adminRecovered: 2,
      shopperRecovered: 1,
    });
  });

  it("does not perform additional database operations", async () => {
    await recoverFeedbackEmailClaims();

    expect(mocks.updateMany).toHaveBeenCalledTimes(2);
  });

  it("propagates a database recovery failure", async () => {
    mocks.updateMany.mockReset();

    mocks.updateMany
      .mockRejectedValueOnce(
        new Error("Database unavailable")
      )
      .mockResolvedValueOnce({ count: 0 });

    await expect(
      recoverFeedbackEmailClaims()
    ).rejects.toThrow("Database unavailable");
  });
});