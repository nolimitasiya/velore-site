import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  findPending: vi.fn(),
  findChallenge: vi.fn(),
  findShopper: vi.fn(),
  updateShopper: vi.fn(),
  updateChallenge: vi.fn(),
  updateChallenges: vi.fn(),
  transaction: vi.fn(),
  cancelMarketingEvents: vi.fn(),
  createConsentSync: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopperEmailChange: {
      findFirst: mocks.findPending,
      updateMany: mocks.updateChallenges,
      update: mocks.updateChallenge,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/auth/ShopperSession", () => ({
  requireAuthenticatedShopper: mocks.authenticate,
}));

import { POST } from "./route";

const FIXED_NOW = new Date("2026-11-12T12:00:00.000Z");

const SHOPPER_ID =
  "00000000-0000-4000-8000-000000000001";

const CHALLENGE_ID =
  "00000000-0000-4000-8000-000000000002";

const OLD_EMAIL = "old@example.test";
const NEW_EMAIL = "new@example.test";
const VALID_CODE = "123456";

const CODE_HASH = createHash("sha256")
  .update(VALID_CODE)
  .digest("hex");

const pendingChallenge = {
  id: CHALLENGE_ID,
  shopperId: SHOPPER_ID,
  newEmail: NEW_EMAIL,
  codeHash: CODE_HASH,
  status: "PENDING",
  attemptCount: 0,
  expiresAt: new Date("2026-11-12T12:10:00.000Z"),
  createdAt: FIXED_NOW,
};

function makeRequest(code: unknown = VALID_CODE) {
  return new Request(
    "http://localhost:3000/api/account/security/email/verify",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ code }),
    },
  ) as NextRequest;
}

describe("shopper email-change verification baseline", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);

    mocks.authenticate.mockResolvedValue({
      id: SHOPPER_ID,
    });

    mocks.findPending.mockResolvedValue({
      ...pendingChallenge,
    });

    mocks.findChallenge.mockResolvedValue({
      ...pendingChallenge,
    });

    mocks.findShopper
      .mockResolvedValueOnce({
        id: SHOPPER_ID,
        email: OLD_EMAIL,
        marketingConsent: false,
        marketingConsentVersion: 0,
      })
      .mockResolvedValueOnce(null);

    mocks.updateShopper.mockResolvedValue({
      email: NEW_EMAIL,
    });

    mocks.updateChallenge.mockResolvedValue({
      ...pendingChallenge,
      status: "VERIFIED",
    });

    mocks.updateChallenges.mockResolvedValue({
      count: 1,
    });
    mocks.cancelMarketingEvents.mockResolvedValue({
      count: 1,
    });

    mocks.createConsentSync.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000003",
    });

    mocks.transaction.mockImplementation(
      async (callback) =>
        callback({
          shopperEmailChange: {
            findUnique: mocks.findChallenge,
            update: mocks.updateChallenge,
          },
          shopper: {
            findUnique: mocks.findShopper,
            update: mocks.updateShopper,
          },
          shopperMarketingEvent: {
            updateMany: mocks.cancelMarketingEvents,
          },
          shopperMarketingConsentSync: {
            create: mocks.createConsentSync,
          },
        }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("successfully verifies an email change", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(await response.json()).toEqual({
      ok: true,
      email: NEW_EMAIL,
      message: "Your email address has been updated.",
    });

    expect(mocks.updateShopper).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: SHOPPER_ID,
        },
        data: expect.objectContaining({
          email: NEW_EMAIL,
        }),
        select: {
          email: true,
        },
      }),
    );

    expect(mocks.updateChallenge).toHaveBeenCalledWith({
      where: {
        id: CHALLENGE_ID,
      },
      data: {
        status: "VERIFIED",
        usedAt: FIXED_NOW,
      },
    });
  });

  it("rejects a malformed verification code", async () => {
    const response = await POST(makeRequest("123"));

    expect(response.status).toBe(400);
    expect(mocks.findPending).not.toHaveBeenCalled();
  });

  it("rejects when no pending challenge exists", async () => {
    mocks.findPending.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an expired challenge", async () => {
    mocks.findPending.mockResolvedValue({
      ...pendingChallenge,
      expiresAt: new Date("2026-11-12T11:59:00.000Z"),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);

    expect(mocks.updateChallenges).toHaveBeenCalledWith({
      where: {
        id: CHALLENGE_ID,
        status: "PENDING",
      },
      data: {
        status: "EXPIRED",
      },
    });
  });

  it("rejects a locked challenge", async () => {
    mocks.findPending.mockResolvedValue({
      ...pendingChallenge,
      attemptCount: 5,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);

    expect(mocks.updateChallenges).toHaveBeenCalledWith({
      where: {
        id: CHALLENGE_ID,
        status: "PENDING",
      },
      data: {
        status: "LOCKED",
      },
    });
  });

  it("rejects an incorrect code", async () => {
    mocks.updateChallenge.mockResolvedValue({
      attemptCount: 1,
    });

    const response = await POST(makeRequest("654321"));

    expect(response.status).toBe(400);

    expect(await response.json()).toEqual({
      error: "That verification code is incorrect.",
      attemptsRemaining: 4,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("locks the challenge after the fifth incorrect code", async () => {
    mocks.findPending.mockResolvedValue({
      ...pendingChallenge,
      attemptCount: 4,
    });

    mocks.updateChallenge.mockResolvedValue({
      attemptCount: 5,
    });

    const response = await POST(makeRequest("654321"));

    expect(response.status).toBe(429);

    expect(mocks.updateChallenges).toHaveBeenCalledWith({
      where: {
        id: CHALLENGE_ID,
        status: "PENDING",
      },
      data: {
        status: "LOCKED",
      },
    });
  });

  it("rejects an invalidated challenge inside the transaction", async () => {
    mocks.findChallenge.mockResolvedValue({
      ...pendingChallenge,
      status: "VERIFIED",
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
  });

  it("rejects an email already owned by another shopper", async () => {
    mocks.findShopper
      .mockReset()
      .mockResolvedValueOnce({
        id: SHOPPER_ID,
        email: OLD_EMAIL,
      })
      .mockResolvedValueOnce({
        id: "00000000-0000-4000-8000-000000000099",
      });

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
  });

  it("returns 404 when the shopper no longer exists", async () => {
    mocks.findShopper.mockReset().mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(404);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.authenticate.mockRejectedValue(
      new Error("UNAUTHENTICATED_SHOPPER"),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.findPending).not.toHaveBeenCalled();
  });

  it("returns 500 when the transaction fails", async () => {
    mocks.transaction.mockRejectedValue(
      new Error("Mock transaction failure"),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
  });
});

describe("email-change marketing consent reset", () => {
  const SHOPPER_ID =
    "00000000-0000-4000-8000-000000000001";

  const OLD_EMAIL = "old@example.test";
  const NEW_EMAIL = "new@example.test";

  const FIXED_NOW =
    new Date("2026-11-12T12:00:00.000Z");

  const VALID_CODE = "123456";

  const CODE_HASH = createHash("sha256")
    .update(VALID_CODE)
    .digest("hex");

  const challenge = {
    id: "00000000-0000-4000-8000-000000000002",
    shopperId: SHOPPER_ID,
    newEmail: NEW_EMAIL,
    codeHash: CODE_HASH,
    status: "PENDING",
    attemptCount: 0,
    expiresAt:
      new Date("2026-11-12T12:10:00.000Z"),
    createdAt: FIXED_NOW,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);

    mocks.authenticate.mockResolvedValue({
      id: SHOPPER_ID,
    });

    mocks.findPending.mockResolvedValue({
      ...challenge,
    });

    mocks.findChallenge.mockResolvedValue({
      ...challenge,
    });

    mocks.findShopper
      .mockResolvedValueOnce({
        id: SHOPPER_ID,
        email: OLD_EMAIL,
        marketingConsent: true,
        marketingConsentVersion: 3,
      })
      .mockResolvedValueOnce(null);

    mocks.updateShopper.mockResolvedValue({
      email: NEW_EMAIL,
    });

    mocks.updateChallenge.mockResolvedValue({
      ...challenge,
      status: "VERIFIED",
    });

    mocks.updateChallenges.mockResolvedValue({
      count: 1,
    });
    mocks.cancelMarketingEvents.mockResolvedValue({
      count: 1,
    });

    mocks.createConsentSync.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000003",
    });

    mocks.transaction.mockImplementation(
      async (callback) =>
        callback({
          shopperEmailChange: {
            findUnique: mocks.findChallenge,
            update: mocks.updateChallenge,
          },
          shopper: {
            findUnique: mocks.findShopper,
            update: mocks.updateShopper,
          },
          shopperMarketingEvent: {
            updateMany: mocks.cancelMarketingEvents,
          },
          shopperMarketingConsentSync: {
            create: mocks.createConsentSync,
          },
        }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resets consent and records verification of the new email", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(mocks.updateShopper).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: NEW_EMAIL,
          emailVerifiedAt: FIXED_NOW,
          marketingConsent: false,
          marketingConsentAt: null,
          marketingConsentSource: null,
          marketingConsentVersion: {
            increment: 1,
          },
        }),
      }),
    );
  });

  it("uses a serializable transaction for email changes", async () => {
    await POST(makeRequest());

    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel:
          "Serializable",
      }),
    );
  });
  it("cancels unsent marketing events after email change", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(mocks.cancelMarketingEvents).toHaveBeenCalledWith({
      where: {
        shopperId: SHOPPER_ID,
        status: {
          in: ["PENDING", "FAILED"],
        },
      },
      data: {
        status: "CANCELLED",
        nextAttemptAt: null,
      },
    });
  });

  it("records withdrawal for the old email address", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(mocks.createConsentSync).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopperId: SHOPPER_ID,
          email: OLD_EMAIL,
          desiredConsent: false,
          reason: "EMAIL_CHANGE_OLD_ADDRESS",
          status: "PENDING",
        }),
      }),
    );
  });

  it("records non-marketing state for the new email address", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(mocks.createConsentSync).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopperId: SHOPPER_ID,
          email: NEW_EMAIL,
          desiredConsent: false,
          reason: "EMAIL_CHANGE_NEW_ADDRESS",
          status: "PENDING",
        }),
      }),
    );
  });

  it("uses the same incremented consent version for both email addresses", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(mocks.updateShopper).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          marketingConsentVersion: {
            increment: 1,
          },
        }),
      }),
    );

    expect(mocks.createConsentSync).toHaveBeenCalledTimes(2);

    const operations = mocks.createConsentSync.mock.calls.map(
      ([argument]) => argument.data,
    );

    expect(operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: OLD_EMAIL,
          consentVersion: 4,
          desiredConsent: false,
          reason: "EMAIL_CHANGE_OLD_ADDRESS",
        }),
        expect.objectContaining({
          email: NEW_EMAIL,
          consentVersion: 4,
          desiredConsent: false,
          reason: "EMAIL_CHANGE_NEW_ADDRESS",
        }),
      ]),
    );

    expect(operations[0].operationKey).not.toBe(
      operations[1].operationKey,
    );
  });

  it("returns 409 when a serializable transaction conflicts", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "Transaction failed due to a write conflict or a deadlock.",
      {
        code: "P2034",
        clientVersion: "6.19.3",
      },
    );

    mocks.transaction.mockRejectedValue(conflict);

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);

    expect(await response.json()).toEqual({
      error:
        "Your email change could not be completed because of a concurrent update. Please try verifying again.",
    });

    expect(mocks.updateShopper).not.toHaveBeenCalled();
    expect(mocks.createConsentSync).not.toHaveBeenCalled();
  });

  it("does not report success when consent synchronisation creation fails", async () => {
    mocks.createConsentSync.mockRejectedValue(
      new Error("Mock consent sync failure"),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });
});