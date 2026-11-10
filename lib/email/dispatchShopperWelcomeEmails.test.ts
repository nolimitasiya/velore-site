import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  process: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopper: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock("@/lib/email/processShopperWelcomeEmail", () => ({
  processShopperWelcomeEmail: mocks.process,
}));

import {
  dispatchShopperWelcomeEmails,
} from "@/lib/email/dispatchShopperWelcomeEmails";

describe("shopper welcome email dispatcher", () => {
  const rolloutEnvName = "SHOPPER_WELCOME_EMAIL_ROLLOUT_AT";
  const originalRolloutValue = process.env[rolloutEnvName];

  afterAll(() => {
    if (originalRolloutValue === undefined) {
      delete process.env[rolloutEnvName];
    } else {
      process.env[rolloutEnvName] = originalRolloutValue;
    }
  });

  it("skips database access when rollout configuration is missing", async () => {
    delete process.env[rolloutEnvName];

    const result = await dispatchShopperWelcomeEmails();

    expect(result).toEqual({
      examined: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });

    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("skips database access when rollout configuration is invalid", async () => {
    process.env[rolloutEnvName] = "invalid";

    const result = await dispatchShopperWelcomeEmails();

    expect(result.examined).toBe(0);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("filters shoppers by the rollout boundary", async () => {
    process.env[rolloutEnvName] =
      "2026-11-15T00:00:00.000Z";

    mocks.findMany.mockResolvedValueOnce([]);

    await dispatchShopperWelcomeEmails();

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date("2026-11-15T00:00:00.000Z"),
          },
        }),
      })
    );
  });
  beforeEach(() => {
    process.env[rolloutEnvName] =
      "2026-11-15T00:00:00.000Z";
    vi.clearAllMocks();
  });

  it("processes a maximum batch of three and counts outcomes", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "shopper-1" },
      { id: "shopper-2" },
      { id: "shopper-3" },
    ]);

    mocks.process
      .mockResolvedValueOnce("SENT")
      .mockResolvedValueOnce("FAILED")
      .mockResolvedValueOnce("SKIPPED");

    const result = await dispatchShopperWelcomeEmails();

    expect(result).toEqual({
      examined: 3,
      sent: 1,
      failed: 1,
      skipped: 1,
    });

    expect(mocks.process).toHaveBeenCalledTimes(3);

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
      })
    );
  });

  it("does not process shoppers when none are eligible", async () => {
    mocks.findMany.mockResolvedValue([]);

    const result = await dispatchShopperWelcomeEmails();

    expect(result).toEqual({
      examined: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });

    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("requires verified ownership and excludes PROCESSING retries", async () => {
    mocks.findMany.mockResolvedValue([]);

    await dispatchShopperWelcomeEmails();

    const query = mocks.findMany.mock.calls[0][0];

    expect(query.where.emailVerifiedAt).toEqual({
      not: null,
    });

    expect(query.where.emailVerifications).toEqual({
      some: {
        status: "VERIFIED",
      },
    });

    expect(query.where.welcomeEmailSentAt).toBeNull();

    expect(query.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          welcomeEmailStatus: "PENDING",
        }),
        expect.objectContaining({
          welcomeEmailStatus: "FAILED",
        }),
      ])
    );

    expect(
      query.where.OR.some(
        (condition: { welcomeEmailStatus: string }) =>
          condition.welcomeEmailStatus === "PROCESSING"
      )
    ).toBe(false);
  });
});