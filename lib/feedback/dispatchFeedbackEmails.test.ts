import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  processFeedbackEmail: vi.fn(),
  recoverFeedbackEmailClaims: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feedbackSubmission: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock("@/lib/feedback/processFeedbackEmail", () => ({
  processFeedbackEmail: mocks.processFeedbackEmail,
}));

vi.mock("@/lib/feedback/recoverFeedbackEmailClaims", () => ({
  recoverFeedbackEmailClaims:
    mocks.recoverFeedbackEmailClaims,
}));

import {
  dispatchFeedbackEmails,
} from "@/lib/feedback/dispatchFeedbackEmails";

import {
  FEEDBACK_EMAIL_LEASE_MS,
  FEEDBACK_EMAIL_MAX_ATTEMPTS,
} from "@/lib/feedback/feedbackEmailRetry";

describe("feedback email dispatcher", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.recoverFeedbackEmailClaims.mockResolvedValue({
      adminRecovered: 2,
      shopperRecovered: 1,
    });

    mocks.findMany.mockResolvedValue([]);

    mocks.processFeedbackEmail.mockResolvedValue("SENT");
  });

  it("runs recovery before selecting eligible submissions", async () => {
    const callOrder: string[] = [];

    mocks.recoverFeedbackEmailClaims.mockImplementation(
      async () => {
        callOrder.push("recover");

        return {
          adminRecovered: 0,
          shopperRecovered: 0,
        };
      }
    );

    mocks.findMany.mockImplementation(async () => {
      callOrder.push("select");
      return [];
    });

    await dispatchFeedbackEmails();

    expect(callOrder).toEqual(["recover", "select"]);
  });

  it("selects at most three submissions in creation order", async () => {
    await dispatchFeedbackEmails();

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      })
    );
  });

  it("uses Admin-only eligibility and the configured retry limit", async () => {
    await dispatchFeedbackEmails();

    const query = mocks.findMany.mock.calls[0][0];

    expect(query.where.adminEmailAttempts).toEqual({
      lt: FEEDBACK_EMAIL_MAX_ATTEMPTS,
    });

    expect(query.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adminEmailStatus: "PENDING",
        }),
        expect.objectContaining({
          adminEmailStatus: "FAILED",
        }),
        expect.objectContaining({
          adminEmailStatus: "PROCESSING",
        }),
      ])
    );

    expect(
      JSON.stringify(query.where)
    ).not.toContain("shopperEmail");
  });

  it("uses the configured lease duration for expired claims", async () => {
    const before = Date.now();

    await dispatchFeedbackEmails();

    const after = Date.now();

    const query = mocks.findMany.mock.calls[0][0];

    const processingCondition = query.where.OR.find(
      (condition: {
        adminEmailStatus: string;
      }) => condition.adminEmailStatus === "PROCESSING"
    );

    const expiry =
      processingCondition.adminEmailClaimedAt.lte.getTime();

    expect(expiry).toBeGreaterThanOrEqual(
      before - FEEDBACK_EMAIL_LEASE_MS
    );

    expect(expiry).toBeLessThanOrEqual(
      after - FEEDBACK_EMAIL_LEASE_MS
    );
  });

  it("dispatches exclusively to ADMIN", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "feedback-1" },
      { id: "feedback-2" },
      { id: "feedback-3" },
    ]);

    await dispatchFeedbackEmails();

    expect(mocks.processFeedbackEmail).toHaveBeenCalledTimes(3);

    expect(
      mocks.processFeedbackEmail.mock.calls
    ).toEqual([
      ["feedback-1", "ADMIN"],
      ["feedback-2", "ADMIN"],
      ["feedback-3", "ADMIN"],
    ]);
  });

  it("counts SENT, FAILED and STALE outcomes", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "feedback-1" },
      { id: "feedback-2" },
      { id: "feedback-3" },
    ]);

    mocks.processFeedbackEmail
      .mockResolvedValueOnce("SENT")
      .mockResolvedValueOnce("FAILED")
      .mockResolvedValueOnce("STALE");

    const result = await dispatchFeedbackEmails();

    expect(result).toEqual({
      examined: 3,
      sent: 1,
      failed: 1,
      skipped: 0,
      stale: 1,
      recovered: 3,
    });
  });

  it("counts skipped claims correctly", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "feedback-1" },
    ]);

    mocks.processFeedbackEmail.mockResolvedValueOnce(
      "SKIPPED"
    );

    const result = await dispatchFeedbackEmails();

    expect(result).toEqual({
      examined: 1,
      sent: 0,
      failed: 0,
      skipped: 1,
      stale: 0,
      recovered: 3,
    });
  });

  it("handles an empty batch without processing emails", async () => {
    const result = await dispatchFeedbackEmails();

    expect(result).toEqual({
      examined: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      stale: 0,
      recovered: 3,
    });

    expect(mocks.processFeedbackEmail).not.toHaveBeenCalled();
  });

  it("propagates recovery failures without dispatching", async () => {
    mocks.recoverFeedbackEmailClaims.mockRejectedValueOnce(
      new Error("Recovery unavailable")
    );

    await expect(
      dispatchFeedbackEmails()
    ).rejects.toThrow("Recovery unavailable");

    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.processFeedbackEmail).not.toHaveBeenCalled();
  });

  it("propagates processing errors rather than reporting success", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "feedback-1" },
    ]);

    mocks.processFeedbackEmail.mockRejectedValueOnce(
      new Error("Database completion unavailable")
    );

    await expect(
      dispatchFeedbackEmails()
    ).rejects.toThrow(
      "Database completion unavailable"
    );
  });
});