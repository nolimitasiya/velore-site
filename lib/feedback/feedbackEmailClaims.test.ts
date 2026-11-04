import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feedbackSubmission: {
      updateMany: mocks.updateMany,
      findUnique: mocks.findUnique,
    },
  },
}));

import {
  claimFeedbackEmail,
  type FeedbackEmailClaim,
} from "@/lib/feedback/claimFeedbackEmail";

import {
  completeFeedbackEmail,
} from "@/lib/feedback/completeFeedbackEmail";

const feedbackId = "feedback-test-001";

describe("feedback email claiming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks shopper acknowledgements before accessing Prisma", async () => {
    const result = await claimFeedbackEmail(
      feedbackId,
      "SHOPPER"
    );

    expect(result).toBeNull();
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("claims an eligible Admin email and increments attempts", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    mocks.findUnique.mockResolvedValueOnce({
      id: feedbackId,
      adminEmailAttempts: 1,
      shopperEmailAttempts: 0,
    });

    const result = await claimFeedbackEmail(
      feedbackId,
      "ADMIN"
    );

    expect(result).toMatchObject({
      feedbackId,
      recipient: "ADMIN",
      attempts: 1,
    });

    expect(result?.claimedAt).toBeInstanceOf(Date);

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: feedbackId,
          adminEmailAttempts: {
            lt: 5,
          },
        }),
        data: expect.objectContaining({
          adminEmailStatus: "PROCESSING",
          adminEmailAttempts: {
            increment: 1,
          },
          adminEmailNextAttemptAt: null,
        }),
      })
    );
  });

  it("does not read the submission when the claim fails", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });

    const result = await claimFeedbackEmail(
      feedbackId,
      "ADMIN"
    );

    expect(result).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("allows only one successful claim when competing updates return 1 and 0", async () => {
    mocks.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    mocks.findUnique.mockResolvedValueOnce({
      id: feedbackId,
      adminEmailAttempts: 1,
      shopperEmailAttempts: 0,
    });

    const results = await Promise.all([
      claimFeedbackEmail(feedbackId, "ADMIN"),
      claimFeedbackEmail(feedbackId, "ADMIN"),
    ]);

    expect(
      results.filter((result) => result !== null)
    ).toHaveLength(1);

    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
  });

  it("requires an expired lease before reclaiming PROCESSING", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });

    await claimFeedbackEmail(feedbackId, "ADMIN");

    const argument = mocks.updateMany.mock.calls[0][0];

    expect(argument.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adminEmailStatus: "PROCESSING",
          adminEmailClaimedAt: expect.objectContaining({
            not: null,
            lte: expect.any(Date),
          }),
        }),
      ])
    );
  });

  it("rejects claims when the maximum attempt count has been reached", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });

    const result = await claimFeedbackEmail(
      feedbackId,
      "ADMIN"
    );

    expect(result).toBeNull();

    expect(mocks.updateMany.mock.calls[0][0].where)
      .toMatchObject({
        adminEmailAttempts: {
          lt: 5,
        },
      });
  });

  it("throws if a successfully claimed submission disappears", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });
    mocks.findUnique.mockResolvedValueOnce(null);

    await expect(
      claimFeedbackEmail(feedbackId, "ADMIN")
    ).rejects.toThrow(
      "Feedback disappeared after its email was claimed."
    );
  });
});

describe("feedback email completion", () => {
  const claimedAt = new Date(
    "2026-10-25T12:00:00.000Z"
  );

  const claim: FeedbackEmailClaim = {
    feedbackId,
    recipient: "ADMIN",
    attempts: 2,
    claimedAt,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a successfully delivered email as SENT", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    const result = await completeFeedbackEmail(
      claim,
      { status: "SENT" }
    );

    expect(result).toBe(true);

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: feedbackId,
          adminEmailStatus: "PROCESSING",
          adminEmailAttempts: 2,
          adminEmailClaimedAt: claimedAt,
        },
        data: expect.objectContaining({
          adminEmailStatus: "SENT",
          adminEmailClaimedAt: null,
          adminEmailNextAttemptAt: null,
          adminEmailSentAt: expect.any(Date),
        }),
      })
    );
  });

  it("schedules a retry when delivery fails", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    const before = Date.now();

    const result = await completeFeedbackEmail(
      claim,
      { status: "FAILED" }
    );

    const after = Date.now();

    expect(result).toBe(true);

    const data = mocks.updateMany.mock.calls[0][0].data;

    expect(data.adminEmailStatus).toBe("FAILED");
    expect(data.adminEmailNextAttemptAt).toBeInstanceOf(Date);

    // Attempt two has a five-minute retry delay.
    expect(
      data.adminEmailNextAttemptAt.getTime()
    ).toBeGreaterThanOrEqual(before + 300_000);

    expect(
      data.adminEmailNextAttemptAt.getTime()
    ).toBeLessThanOrEqual(after + 300_000);
  });

  it("does not schedule another retry after attempt five", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    await completeFeedbackEmail(
      {
        ...claim,
        attempts: 5,
      },
      { status: "FAILED" }
    );

    expect(mocks.updateMany.mock.calls[0][0].data)
      .toMatchObject({
        adminEmailStatus: "FAILED",
        adminEmailNextAttemptAt: null,
      });
  });

  it("does not overwrite a newer claim when the conditional update fails", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });

    const result = await completeFeedbackEmail(
      claim,
      { status: "SENT" }
    );

    expect(result).toBe(false);

    expect(mocks.updateMany.mock.calls[0][0].where)
      .toEqual({
        id: feedbackId,
        adminEmailStatus: "PROCESSING",
        adminEmailAttempts: 2,
        adminEmailClaimedAt: claimedAt,
      });
  });

  it("uses separate fields for shopper and Admin completion", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    await completeFeedbackEmail(
      {
        ...claim,
        recipient: "SHOPPER",
      },
      { status: "SENT" }
    );

    expect(mocks.updateMany.mock.calls[0][0].where)
      .toEqual({
        id: feedbackId,
        shopperEmailStatus: "PROCESSING",
        shopperEmailAttempts: 2,
        shopperEmailClaimedAt: claimedAt,
      });
  });
});