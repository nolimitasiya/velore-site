import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findUnique: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopper: {
      updateMany: mocks.updateMany,
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock("@/lib/email/sendShopperWelcomeEmail", () => ({
  sendShopperWelcomeEmail: mocks.send,
}));

import { processShopperWelcomeEmail } from "./processShopperWelcomeEmail";

const shopper = {
  id: "shopper-test-123",
  email: "shopper@example.test",
  firstName: "Amina",
  welcomeEmailAttempts: 1,
};

describe("shopper welcome email delivery", () => {
  const rolloutEnvName = "SHOPPER_WELCOME_EMAIL_ROLLOUT_AT";
  const originalRolloutValue = process.env[rolloutEnvName];

  afterAll(() => {
    if (originalRolloutValue === undefined) {
      delete process.env[rolloutEnvName];
    } else {
      process.env[rolloutEnvName] = originalRolloutValue;
    }
  });

  it("skips without database access when rollout is missing", async () => {
    delete process.env[rolloutEnvName];

    const result = await processShopperWelcomeEmail(
      "shopper-123"
    );

    expect(result).toBe("SKIPPED");
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("skips without database access when rollout is invalid", async () => {
    process.env[rolloutEnvName] = "invalid";

    const result = await processShopperWelcomeEmail(
      "shopper-123"
    );

    expect(result).toBe("SKIPPED");
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("includes the rollout boundary in the atomic claim", async () => {
    process.env[rolloutEnvName] =
      "2026-11-15T00:00:00.000Z";

    mocks.updateMany.mockResolvedValueOnce({ count: 0 });

    const result = await processShopperWelcomeEmail(
      "shopper-123"
    );

    expect(result).toBe("SKIPPED");

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date("2026-11-15T00:00:00.000Z"),
          },
        }),
      })
    );

    expect(mocks.send).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    process.env[rolloutEnvName] =
      "2026-11-15T00:00:00.000Z";
    vi.clearAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUnique.mockResolvedValue(shopper);
    mocks.send.mockResolvedValue({
      id: "resend-message-123",
    });
  });

  it("records successful delivery", async () => {
    const result = await processShopperWelcomeEmail(
      shopper.id
    );

    expect(result).toBe("SENT");

    expect(mocks.send).toHaveBeenCalledWith({
      to: shopper.email,
      firstName: shopper.firstName,
      idempotencyKey:
        `shopper-welcome-${shopper.id}`,
    });

    expect(mocks.updateMany).toHaveBeenCalledTimes(2);

    expect(mocks.updateMany.mock.calls[1][0].data)
      .toMatchObject({
        welcomeEmailStatus: "SENT",
        welcomeEmailProviderId:
          "resend-message-123",
        welcomeEmailClaimedAt: null,
      });
  });

  it("does not resend when recording provider acceptance fails", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      mocks.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockRejectedValueOnce(
          new Error("Database unavailable")
        );

      const result = await processShopperWelcomeEmail(
        shopper.id
      );

      expect(result).toBe("FAILED");
      expect(mocks.send).toHaveBeenCalledTimes(1);
      expect(mocks.updateMany).toHaveBeenCalledTimes(2);

      expect(mocks.updateMany.mock.calls[1][0].data)
        .toMatchObject({
          welcomeEmailStatus: "SENT",
          welcomeEmailProviderId: "resend-message-123",
        });
    } finally {
      errorSpy.mockRestore();
    }
  });
  it("skips an email that cannot be claimed", async () => {
    mocks.updateMany.mockResolvedValueOnce({
      count: 0,
    });

    const result = await processShopperWelcomeEmail(
      shopper.id
    );

    expect(result).toBe("SKIPPED");
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("records provider failure and schedules retry", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      mocks.send.mockRejectedValueOnce(
        new Error("Provider unavailable")
      );

      const result = await processShopperWelcomeEmail(
        shopper.id
      );

      expect(result).toBe("FAILED");

      expect(mocks.updateMany).toHaveBeenCalledTimes(2);

      const failureUpdate =
        mocks.updateMany.mock.calls[1][0];

      expect(failureUpdate.data).toMatchObject({
        welcomeEmailStatus: "FAILED",
        welcomeEmailClaimedAt: null,
      });

      expect(
        failureUpdate.data.welcomeEmailNextAttemptAt
      ).toBeInstanceOf(Date);
    } finally {
      errorSpy.mockRestore();
    }
  });
});