import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { NextRequest } from "next/server";

import { Prisma } from "@prisma/client";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  findShopper: vi.fn(),
  updateShopper: vi.fn(),
  cancelEvents: vi.fn(),
  updateNewsletter: vi.fn(),
  findConsentSync: vi.fn(),
  createConsentSync: vi.fn(),
  executeRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopper: {
      findUnique: mocks.findShopper,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/auth/ShopperSession", () => ({
  requireAuthenticatedShopper:
    mocks.authenticate,
}));

import { GET, PATCH } from "./route";

const FIXED_NOW =
  new Date("2026-11-12T12:00:00.000Z");

const SHOPPER_ID =
  "00000000-0000-4000-8000-000000000001";

function shopper(overrides: Record<string, unknown> = {}) {
  return {
    id: SHOPPER_ID,
    dateOfBirth:
      new Date("2000-01-01T00:00:00.000Z"),
    email: "shopper@example.com",
    emailVerifiedAt:
      new Date("2026-11-01T12:00:00.000Z"),
    marketingConsent: false,
    marketingConsentAt: null,
    marketingConsentVersion: 0,
    ...overrides,
  };
}

function makeGetRequest() {
  return new Request(
    "http://localhost:3000/api/account/marketing-preferences",
    { method: "GET" }
  ) as NextRequest;
}

function makePatchRequest(body: unknown) {
  return new Request(
    "http://localhost:3000/api/account/marketing-preferences",
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  ) as NextRequest;
}

describe("shopper marketing preferences API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);

    mocks.authenticate.mockResolvedValue({
      id: SHOPPER_ID,
    });

    mocks.findShopper.mockResolvedValue(
      shopper()
    );

    mocks.updateShopper.mockResolvedValue(
      shopper()
    );

    mocks.cancelEvents.mockResolvedValue({
      count: 1,
    });

    mocks.updateNewsletter.mockResolvedValue({
      count: 1,
    });

    mocks.executeRaw.mockResolvedValue(1);

    mocks.findConsentSync.mockResolvedValue(null);

    mocks.createConsentSync.mockResolvedValue({
      id: "mock-consent-sync",
    });

    mocks.transaction.mockImplementation(
      async (callback) =>
        callback({
          $executeRaw: mocks.executeRaw,
          shopper: {
            findUnique: mocks.findShopper,
            update: mocks.updateShopper,
          },
          shopperMarketingEvent: {
            updateMany: mocks.cancelEvents,
          },
          newsletterSubscriber: {
            updateMany: mocks.updateNewsletter,
          },
          shopperMarketingConsentSync: {
            findFirst: mocks.findConsentSync,
            create: mocks.createConsentSync,
          },
        })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns marketing preferences for an adult", async () => {
    const response = await GET(makeGetRequest());

    expect(response.status).toBe(200);

    expect(await response.json()).toEqual({
      marketingConsent: false,
      eligibleToOptIn: true,
    });
  });

  it("reports under-18 shoppers as ineligible", async () => {
    mocks.findShopper.mockResolvedValue(
      shopper({
        dateOfBirth:
          new Date("2010-01-01T00:00:00.000Z"),
      })
    );

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(200);

    expect(await response.json()).toEqual({
      marketingConsent: false,
      eligibleToOptIn: false,
    });
  });

  it("rejects unauthenticated GET requests", async () => {
    mocks.authenticate.mockRejectedValue(
      new Error("UNAUTHENTICATED_SHOPPER")
    );

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(401);
    expect(mocks.findShopper).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated PATCH requests", async () => {
    mocks.authenticate.mockRejectedValue(
      new Error("UNAUTHENTICATED_SHOPPER")
    );

    const response = await PATCH(
      makePatchRequest({ marketingConsent: true })
    );

    expect(response.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects non-boolean marketing consent", async () => {
    const response = await PATCH(
      makePatchRequest({
        marketingConsent: "true",
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a missing consent value", async () => {
    const response = await PATCH(
      makePatchRequest({})
    );

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects under-18 opt-in", async () => {
    mocks.findShopper.mockResolvedValue(
      shopper({
        dateOfBirth:
          new Date("2010-01-01T00:00:00.000Z"),
      })
    );

    const response = await PATCH(
      makePatchRequest({
        marketingConsent: true,
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
  });

  it("rejects opt-in when email is unverified", async () => {
    mocks.findShopper.mockResolvedValue(
      shopper({
        emailVerifiedAt: null,
      })
    );

    const response = await PATCH(
      makePatchRequest({
        marketingConsent: true,
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
    expect(mocks.createConsentSync).not.toHaveBeenCalled();
  });

  it("allows an adult to opt in", async () => {
    const response = await PATCH(
      makePatchRequest({
        marketingConsent: true,
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.updateNewsletter).not.toHaveBeenCalled();

    expect(mocks.updateShopper).toHaveBeenCalledWith({
      where: { id: SHOPPER_ID },
      data: {
        marketingConsent: true,
        marketingConsentAt: FIXED_NOW,
        marketingConsentSource: "ACCOUNT_PROFILE",
        marketingConsentVersion: {
          increment: 1,
        },
      },
    });

    expect(mocks.cancelEvents).not.toHaveBeenCalled();

    expect(mocks.createConsentSync).toHaveBeenCalledWith({
      data: {
        shopperId: SHOPPER_ID,
        email: "shopper@example.com",
        consentVersion: 1,
        desiredConsent: true,
        providerOperationType: "SUBSCRIBE",
        reason: "ACCOUNT_OPT_IN",
        operationKey:
          `shopper-marketing-consent:${SHOPPER_ID}:1:ACCOUNT_OPT_IN`,
        status: "PENDING",
      },
    });
  });

  it("does not rewrite an unchanged opt-in", async () => {
    mocks.findShopper.mockResolvedValue(
      shopper({
        marketingConsent: true,
        marketingConsentAt: FIXED_NOW,
      })
    );

    const response = await PATCH(
      makePatchRequest({
        marketingConsent: true,
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
    expect(mocks.cancelEvents).not.toHaveBeenCalled();
    expect(mocks.createConsentSync).not.toHaveBeenCalled();
  });

  it("withdraws consent and cancels unsent events", async () => {
    mocks.findShopper.mockResolvedValue(
      shopper({
        marketingConsent: true,
        marketingConsentAt: FIXED_NOW,
      })
    );

    const response = await PATCH(
      makePatchRequest({
        marketingConsent: false,
      })
    );

    expect(response.status).toBe(200);

    expect(mocks.updateNewsletter).toHaveBeenCalledWith({
      where: {
        email: "shopper@example.com",
        status: {
          in: ["pending", "subscribed"],
        },
      },
      data: {
        status: "unsubscribed",
        unsubscribedAt: FIXED_NOW,
        confirmToken: null,
      },
    });

    expect(mocks.updateShopper).toHaveBeenCalledWith({
      where: { id: SHOPPER_ID },
      data: {
        marketingConsent: false,
        marketingConsentAt: null,
        marketingConsentSource: null,
        marketingConsentVersion: {
          increment: 1,
        },
      },
    });

    expect(mocks.createConsentSync).toHaveBeenCalledWith({
      data: {
        shopperId: SHOPPER_ID,
        email: "shopper@example.com",
        consentVersion: 1,
        desiredConsent: false,
        providerOperationType: null,
        reason: "ACCOUNT_OPT_OUT",
        operationKey:
          `shopper-marketing-consent:${SHOPPER_ID}:1:ACCOUNT_OPT_OUT`,
        status: "PENDING",
      },
    });

    expect(mocks.cancelEvents).toHaveBeenCalledWith({
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

  it("repeats cancellation when consent is already false", async () => {
    const response = await PATCH(
      makePatchRequest({
        marketingConsent: false,
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.cancelEvents).toHaveBeenCalledTimes(1);
    expect(mocks.findConsentSync).toHaveBeenCalledTimes(1);
    expect(mocks.updateShopper).toHaveBeenCalledWith({
      where: { id: SHOPPER_ID },
      data: {
        marketingConsent: false,
        marketingConsentAt: null,
        marketingConsentSource: null,
        marketingConsentVersion: {
          increment: 1,
        },
      },
    });
    expect(mocks.createConsentSync).toHaveBeenCalledWith({
      data: {
        shopperId: SHOPPER_ID,
        email: "shopper@example.com",
        consentVersion: 1,
        desiredConsent: false,
        providerOperationType: null,
        reason: "ACCOUNT_OPT_OUT",
        operationKey:
          `shopper-marketing-consent:${SHOPPER_ID}:1:ACCOUNT_OPT_OUT`,
        status: "PENDING",
      },
    });
  });

  it("does not duplicate an existing explicit withdrawal", async () => {
    mocks.findConsentSync.mockResolvedValue({
      reason: "ACCOUNT_OPT_OUT",
    });

    const response = await PATCH(
      makePatchRequest({
        marketingConsent: false,
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.findConsentSync).toHaveBeenCalledTimes(1);
    expect(mocks.cancelEvents).toHaveBeenCalledTimes(1);
    expect(mocks.updateNewsletter).toHaveBeenCalledTimes(1);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
    expect(mocks.createConsentSync).not.toHaveBeenCalled();
  });

  it("does not revive old events when opting back in", async () => {
    const response = await PATCH(
      makePatchRequest({
        marketingConsent: true,
      })
    );

    expect(response.status).toBe(200);

    expect(mocks.cancelEvents).not.toHaveBeenCalled();

    expect(mocks.updateShopper).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          marketingConsent: true,
          marketingConsentSource:
            "ACCOUNT_PROFILE",
        }),
      })
    );
  });

  it("returns 404 when the shopper is missing", async () => {
    mocks.findShopper.mockResolvedValue(null);

    const response = await PATCH(
      makePatchRequest({
        marketingConsent: false,
      })
    );

    expect(response.status).toBe(404);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
  });

  it("returns 500 if cancellation fails", async () => {
    mocks.cancelEvents.mockRejectedValue(
      new Error("MOCK_CANCELLATION_FAILURE")
    );

    const response = await PATCH(
      makePatchRequest({
        marketingConsent: false,
      })
    );

    expect(response.status).toBe(500);
  });

  it("returns an error when consent-sync creation fails", async () => {
    mocks.createConsentSync.mockRejectedValue(
      new Error("MOCK_SYNC_CREATION_FAILURE")
    );

    const response = await PATCH(
      makePatchRequest({
        marketingConsent: true,
      })
    );

    expect(response.status).toBe(500);
    expect(mocks.createConsentSync).toHaveBeenCalledTimes(1);
  });

  it("returns HTTP 409 for a Prisma transaction conflict", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "Mock transaction write conflict",
      {
        code: "P2034",
        clientVersion: "6.19.3",
      }
    );

    mocks.transaction.mockRejectedValue(conflict);

    const response = await PATCH(
      makePatchRequest({
        marketingConsent: false,
      })
    );

    expect(response.status).toBe(409);

    expect(await response.json()).toEqual({
      error:
        "Your marketing preferences could not be saved. Please try again.",
    });

    expect(mocks.updateShopper).not.toHaveBeenCalled();
    expect(mocks.cancelEvents).not.toHaveBeenCalled();
  });
  it("requests a serializable transaction", async () => {
    await PATCH(
      makePatchRequest({
        marketingConsent: false,
      })
    );

    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      })
    );
  });
});