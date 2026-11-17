import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    feedbackSubmission: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    rateLimit: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    tx,
    transaction: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { createFeedbackSubmission } from "./createFeedbackSubmission";

const baseInput = {
  type: "IDEA" as const,
  category: null,
  message: "I would love to see more modest workwear collections.",
  shopperId: "shopper-123",
  guestIpHash: null,
  contactEmail: "shopper@example.com",
  contactName: "Test Shopper",
  emailVerifiedBySession: false,
  productId: null,
  productTitleSnapshot: null,
  brandNameSnapshot: null,
  productUrlSnapshot: null,
  pageUrl: null,
};

describe("createFeedbackSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) =>
        callback(mocks.tx)
    );

    mocks.tx.$queryRaw.mockResolvedValue([{ pg_advisory_xact_lock: "" }]);
    mocks.tx.feedbackSubmission.findUnique.mockResolvedValue(null);
    mocks.tx.rateLimit.findUnique.mockResolvedValue(null);
    mocks.tx.rateLimit.create.mockResolvedValue({});
    mocks.tx.rateLimit.update.mockResolvedValue({});
    mocks.tx.feedbackSubmission.update.mockResolvedValue({});
    mocks.tx.feedbackSubmission.create.mockResolvedValue({
      id: "feedback-123",
    });
  });

  it("rejects submissions without a verified identity key", async () => {
    await expect(
      createFeedbackSubmission({
        ...baseInput,
        shopperId: null,
        guestIpHash: null,
      })
    ).rejects.toThrow("verified identity key");

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates feedback and an initial shopper rate-limit record", async () => {
    const result = await createFeedbackSubmission(baseInput);

    expect(result).toEqual({
      status: "CREATED",
      id: "feedback-123",
      duplicate: false,
    });

    expect(mocks.tx.rateLimit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: "feedback:submission:shopper:shopper-123",
        count: 1,
        resetAt: expect.any(Date),
      }),
    });

    expect(mocks.tx.feedbackSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "IDEA",
        shopperId: "shopper-123",
        status: "NEW",
        duplicateCount: 0,
        adminEmailStatus: "PENDING",
        shopperEmailStatus: "NOT_APPLICABLE",
        dedupeKey: expect.any(String),
        dedupeExpiresAt: expect.any(Date),
      }),
      select: { id: true },
    });
  });

  it("uses a separate rate-limit identity for guests", async () => {
    await createFeedbackSubmission({
      ...baseInput,
      shopperId: null,
      guestIpHash: "guest-hash-123",
      contactEmail: null,
      contactName: null,
    });

    expect(mocks.tx.rateLimit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: "feedback:submission:guest:guest-hash-123",
        count: 1,
      }),
    });
  });

  it("returns an existing duplicate without consuming another allowance", async () => {
    mocks.tx.feedbackSubmission.findUnique.mockResolvedValue({
      id: "existing-feedback",
      dedupeExpiresAt: new Date(Date.now() + 60000),
    });

    const result = await createFeedbackSubmission(baseInput);

    expect(result).toEqual({
      status: "DUPLICATE",
      id: "existing-feedback",
      duplicate: true,
    });

    expect(mocks.tx.feedbackSubmission.update).toHaveBeenCalledWith({
      where: { id: "existing-feedback" },
      data: {
        duplicateCount: { increment: 1 },
      },
    });

    expect(mocks.tx.rateLimit.findUnique).not.toHaveBeenCalled();
    expect(mocks.tx.feedbackSubmission.create).not.toHaveBeenCalled();
  });

  it("rejects a shopper who has reached the hourly limit", async () => {
    const retryAt = new Date(Date.now() + 60000);

    mocks.tx.rateLimit.findUnique.mockResolvedValue({
      count: 5,
      resetAt: retryAt,
    });

    const result = await createFeedbackSubmission(baseInput);

    expect(result).toEqual({
      status: "RATE_LIMITED",
      retryAt,
    });

    expect(mocks.tx.feedbackSubmission.create).not.toHaveBeenCalled();
    expect(mocks.tx.rateLimit.update).not.toHaveBeenCalled();
  });

  it("rejects a guest who has reached the hourly limit", async () => {
    const retryAt = new Date(Date.now() + 60000);

    mocks.tx.rateLimit.findUnique.mockResolvedValue({
      count: 3,
      resetAt: retryAt,
    });

    const result = await createFeedbackSubmission({
      ...baseInput,
      shopperId: null,
      guestIpHash: "guest-hash-123",
    });

    expect(result).toEqual({
      status: "RATE_LIMITED",
      retryAt,
    });

    expect(mocks.tx.feedbackSubmission.create).not.toHaveBeenCalled();
  });

  it("increments an active submission counter", async () => {
    mocks.tx.rateLimit.findUnique.mockResolvedValue({
      count: 2,
      resetAt: new Date(Date.now() + 60000),
    });

    await createFeedbackSubmission(baseInput);

    expect(mocks.tx.rateLimit.update).toHaveBeenCalledWith({
      where: {
        key: "feedback:submission:shopper:shopper-123",
      },
      data: {
        count: { increment: 1 },
      },
    });
  });

  it("resets an expired submission counter", async () => {
    mocks.tx.rateLimit.findUnique.mockResolvedValue({
      count: 5,
      resetAt: new Date(Date.now() - 60000),
    });

    await createFeedbackSubmission(baseInput);

    expect(mocks.tx.rateLimit.update).toHaveBeenCalledWith({
      where: {
        key: "feedback:submission:shopper:shopper-123",
      },
      data: {
        count: 1,
        resetAt: expect.any(Date),
      },
    });
  });

  it("releases an expired duplicate key before creating new feedback", async () => {
    mocks.tx.feedbackSubmission.findUnique.mockResolvedValue({
      id: "old-feedback",
      dedupeExpiresAt: new Date(Date.now() - 60000),
    });

    const result = await createFeedbackSubmission(baseInput);

    expect(result.status).toBe("CREATED");

    expect(mocks.tx.feedbackSubmission.update).toHaveBeenCalledWith({
      where: { id: "old-feedback" },
      data: {
        dedupeKey: null,
        dedupeExpiresAt: null,
      },
    });

    expect(mocks.tx.feedbackSubmission.create).toHaveBeenCalledTimes(1);
  });

  it("propagates persistence failures", async () => {
    mocks.tx.feedbackSubmission.create.mockRejectedValue(
      new Error("Simulated database failure")
    );

    await expect(
      createFeedbackSubmission(baseInput)
    ).rejects.toThrow("Simulated database failure");
  });

  it("requests an advisory lock inside the transaction", async () => {
    await createFeedbackSubmission(baseInput);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.tx.$queryRaw).toHaveBeenCalledTimes(1);
  });
});