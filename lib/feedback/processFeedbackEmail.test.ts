import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  claimFeedbackEmail: vi.fn(),
  completeFeedbackEmail: vi.fn(),
  findUnique: vi.fn(),
  getFeedbackEmailConfig: vi.fn(),
  feedbackAdminEmail: vi.fn(),
  feedbackShopperEmail: vi.fn(),
  sendFeedbackEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feedbackSubmission: {
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock("@/lib/feedback/claimFeedbackEmail", () => ({
  claimFeedbackEmail: mocks.claimFeedbackEmail,
}));

vi.mock("@/lib/feedback/completeFeedbackEmail", () => ({
  completeFeedbackEmail: mocks.completeFeedbackEmail,
}));

vi.mock("@/lib/feedback/feedbackEmailConfig", () => ({
  getFeedbackEmailConfig: mocks.getFeedbackEmailConfig,
}));

vi.mock("@/lib/feedback/feedbackEmailTemplates", () => ({
  feedbackAdminEmail: mocks.feedbackAdminEmail,
  feedbackShopperEmail: mocks.feedbackShopperEmail,
}));

vi.mock("@/lib/feedback/sendFeedbackEmail", () => ({
  sendFeedbackEmail: mocks.sendFeedbackEmail,
}));

import {
  processFeedbackEmail,
} from "@/lib/feedback/processFeedbackEmail";

const feedbackId = "feedback-test-001";

const feedback = {
  id: feedbackId,
  type: "ISSUE",
  category: "PRODUCT",
  message: "The product image is not loading.",
  contactName: "Test Shopper",
  contactEmail: "shopper@example.com",
  pageUrl: "/products/example",
  productTitleSnapshot: "Example Dress",
  brandNameSnapshot: "Example Brand",
};

const claim = {
  feedbackId,
  recipient: "ADMIN",
  attempts: 1,
  claimedAt: new Date("2026-10-25T12:00:00.000Z"),
};

describe("feedback email processing", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.claimFeedbackEmail.mockResolvedValue(claim);

    mocks.findUnique.mockResolvedValue(feedback);

    mocks.getFeedbackEmailConfig.mockReturnValue({
      from: "feedback@example.com",
      adminTo: "admin@example.com",
      label: "Report an Issue",
    });

    mocks.feedbackAdminEmail.mockReturnValue({
      subject: "New feedback report",
      html: "<p>Feedback received</p>",
    });

    mocks.feedbackShopperEmail.mockReturnValue({
      subject: "Thank you",
      html: "<p>Thank you</p>",
    });

    mocks.sendFeedbackEmail.mockResolvedValue({
      id: "email-test-001",
    });

    mocks.completeFeedbackEmail.mockResolvedValue(true);
  });

  it("sends an Admin notification and marks it SENT", async () => {
    const result = await processFeedbackEmail(
      feedbackId,
      "ADMIN"
    );

    expect(result).toBe("SENT");

    expect(mocks.sendFeedbackEmail).toHaveBeenCalledWith({
      from: "feedback@example.com",
      to: "admin@example.com",
      subject: "New feedback report",
      html: "<p>Feedback received</p>",
      idempotencyKey: `feedback-admin-${feedbackId}`,
    });

    expect(mocks.completeFeedbackEmail).toHaveBeenCalledWith(
      claim,
      { status: "SENT" }
    );
  });

  it("does not automatically set an Admin Reply-To", async () => {
    await processFeedbackEmail(feedbackId, "ADMIN");

    const emailInput =
      mocks.sendFeedbackEmail.mock.calls[0][0];

    expect(emailInput).not.toHaveProperty("replyTo");
  });

  it("records FAILED when the provider rejects delivery", async () => {
    mocks.sendFeedbackEmail.mockRejectedValueOnce(
      new Error("Provider unavailable")
    );

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const result = await processFeedbackEmail(
        feedbackId,
        "ADMIN"
      );

      expect(result).toBe("FAILED");

      expect(
        mocks.completeFeedbackEmail
      ).toHaveBeenCalledWith(
        claim,
        { status: "FAILED" }
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("skips delivery when no claim is available", async () => {
    mocks.claimFeedbackEmail.mockResolvedValueOnce(null);

    const result = await processFeedbackEmail(
      feedbackId,
      "ADMIN"
    );

    expect(result).toBe("SKIPPED");
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.sendFeedbackEmail).not.toHaveBeenCalled();
  });

  it("never sends a shopper acknowledgement when claiming is blocked", async () => {
    mocks.claimFeedbackEmail.mockResolvedValueOnce(null);

    const result = await processFeedbackEmail(
      feedbackId,
      "SHOPPER"
    );

    expect(result).toBe("SKIPPED");
    expect(mocks.sendFeedbackEmail).not.toHaveBeenCalled();
    expect(mocks.completeFeedbackEmail).not.toHaveBeenCalled();
  });

  it("returns STALE when SENT completion loses its claim", async () => {
    mocks.completeFeedbackEmail.mockResolvedValueOnce(false);

    const result = await processFeedbackEmail(
      feedbackId,
      "ADMIN"
    );

    expect(result).toBe("STALE");

    expect(mocks.sendFeedbackEmail).toHaveBeenCalledTimes(1);
  });

  it("reuses the same idempotency key across separate attempts", async () => {
    await processFeedbackEmail(feedbackId, "ADMIN");

    mocks.claimFeedbackEmail.mockResolvedValueOnce({
      ...claim,
      attempts: 2,
      claimedAt: new Date("2026-10-25T12:05:00.000Z"),
    });

    await processFeedbackEmail(feedbackId, "ADMIN");

    expect(mocks.sendFeedbackEmail).toHaveBeenCalledTimes(2);

    const firstKey =
      mocks.sendFeedbackEmail.mock.calls[0][0]
        .idempotencyKey;

    const secondKey =
      mocks.sendFeedbackEmail.mock.calls[1][0]
        .idempotencyKey;

    expect(firstKey).toBe(
      `feedback-admin-${feedbackId}`
    );

    expect(secondKey).toBe(firstKey);
  });

  it("returns STALE when a failed delivery cannot complete its claim", async () => {
    mocks.sendFeedbackEmail.mockRejectedValueOnce(
      new Error("Provider unavailable")
    );

    mocks.completeFeedbackEmail.mockResolvedValueOnce(false);

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const result = await processFeedbackEmail(
        feedbackId,
        "ADMIN"
      );

      expect(result).toBe("STALE");
    } finally {
      consoleSpy.mockRestore();
    }
  });
  it("does not mark an accepted email FAILED when recording SENT throws", async () => {
  mocks.completeFeedbackEmail.mockRejectedValueOnce(
    new Error("Database temporarily unavailable")
  );

  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  try {
    await expect(
      processFeedbackEmail(feedbackId, "ADMIN")
    ).rejects.toThrow(
      "Database temporarily unavailable"
    );

    expect(mocks.sendFeedbackEmail).toHaveBeenCalledTimes(1);

    expect(mocks.completeFeedbackEmail).toHaveBeenCalledTimes(1);

    expect(mocks.completeFeedbackEmail).toHaveBeenCalledWith(
      claim,
      { status: "SENT" }
    );

    expect(mocks.completeFeedbackEmail).not.toHaveBeenCalledWith(
      claim,
      { status: "FAILED" }
    );
  } finally {
    consoleSpy.mockRestore();
  }
});
});