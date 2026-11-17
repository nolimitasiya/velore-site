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
  findMarketingShopper: vi.fn(),
  createMarketingEvent: vi.fn(),
  findChallenge: vi.fn(),
  updateChallenge: vi.fn(),
  updateShopper: vi.fn(),
  transaction: vi.fn(),
  verifyCode: vi.fn(),
  isExpired: vi.fn(),
  processWelcome: vi.fn(),
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
  requireAuthenticatedShopper: mocks.authenticate,
}));

vi.mock("@/lib/auth/shopperEmailVerificationCode", () => ({
  verifyShopperEmailVerificationCode: mocks.verifyCode,
  isShopperEmailVerificationExpired: mocks.isExpired,
  SHOPPER_EMAIL_VERIFICATION_MAX_ATTEMPTS: 5,
}));

vi.mock("@/lib/email/processShopperWelcomeEmail", () => ({
  processShopperWelcomeEmail: mocks.processWelcome,
}));

import { POST } from "./route";

const FIXED_NOW = new Date("2026-11-12T12:00:00.000Z");

const shopper = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "verification-test@example.test",
  emailVerifiedAt: null,
};

const challenge = {
  id: "00000000-0000-4000-8000-000000000002",
  shopperId: shopper.id,
  email: shopper.email,
  status: "PENDING",
  attemptCount: 0,
  codeHash: "mock-code-hash",
  expiresAt: new Date("2026-11-12T12:10:00.000Z"),
  sentAt: FIXED_NOW,
  createdAt: FIXED_NOW,
};

function makeRequest(code: unknown = "123456") {
  return new Request(
    "http://localhost:3000/api/account/auth/verify-email",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ code }),
    }
  ) as NextRequest;
}

describe("shopper email verification route baseline", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);

    mocks.authenticate.mockResolvedValue({
      id: shopper.id,
    });

    mocks.findShopper.mockResolvedValue({
      ...shopper,
    });

    mocks.findMarketingShopper.mockResolvedValue({
      marketingConsent: false,
      marketingConsentAt: null,
      dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
    });

    mocks.createMarketingEvent.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000003",
    });

    mocks.findChallenge.mockResolvedValue({
      ...challenge,
    });

    mocks.updateChallenge.mockResolvedValue({
      count: 1,
    });

    mocks.updateShopper.mockResolvedValue({
      count: 1,
    });

    mocks.verifyCode.mockReturnValue(true);
    mocks.isExpired.mockReturnValue(false);
    mocks.processWelcome.mockResolvedValue(undefined);

    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        shopperEmailVerification: {
          findFirst: mocks.findChallenge,
          updateMany: mocks.updateChallenge,
        },
        shopper: {
          updateMany: mocks.updateShopper,
          findUnique: mocks.findMarketingShopper,
        },
        shopperMarketingEvent: {
          create: mocks.createMarketingEvent,
        },
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("successfully verifies a shopper email", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      verified: true,
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateShopper).toHaveBeenCalledTimes(1);
    expect(mocks.processWelcome).toHaveBeenCalledWith(
      shopper.id
    );
  });

  it("does not repeat verification for an already-verified shopper", async () => {
    mocks.findShopper.mockResolvedValue({
      ...shopper,
      emailVerifiedAt: FIXED_NOW,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      alreadyVerified: true,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });

  it("rejects a malformed verification code", async () => {
    const response = await POST(makeRequest("123"));

    expect(response.status).toBe(400);
    expect(mocks.findShopper).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an incorrect verification code", async () => {
    mocks.verifyCode.mockReturnValue(false);

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Incorrect verification code.",
      remainingAttempts: 4,
    });

    expect(mocks.updateShopper).not.toHaveBeenCalled();
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });

  it("rejects an expired verification challenge", async () => {
    mocks.isExpired.mockReturnValue(true);

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "This code has expired. Request a new code.",
    });

    expect(mocks.updateShopper).not.toHaveBeenCalled();
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });

  it("rejects a locked verification challenge", async () => {
    mocks.findChallenge.mockResolvedValue({
      ...challenge,
      attemptCount: 5,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });

  it("rejects when no pending verification challenge exists", async () => {
    mocks.findChallenge.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });

  it("returns retry when verification challenge consumption loses a race", async () => {
    mocks.updateChallenge.mockResolvedValueOnce({
      count: 0,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    expect(mocks.updateShopper).not.toHaveBeenCalled();
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });

  it("rejects a concurrent shopper verification state change", async () => {
    mocks.updateShopper.mockResolvedValue({
      count: 0,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });

  it("handles a serializable transaction conflict", async () => {
    mocks.transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "Transaction conflict",
        {
          code: "P2034",
          clientVersion: "6.19.3",
        }
      )
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });

  it("preserves successful verification if welcome-email processing fails", async () => {
    mocks.processWelcome.mockRejectedValue(
      new Error("Mock welcome-email failure")
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      verified: true,
    });

    expect(mocks.updateShopper).toHaveBeenCalledTimes(1);
    expect(mocks.processWelcome).toHaveBeenCalledTimes(1);
  });

  it("creates one marketing event for an eligible adult", async () => {
    mocks.findMarketingShopper.mockResolvedValue({
      marketingConsent: true,
      marketingConsentAt: new Date("2026-11-11T12:00:00.000Z"),
      dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      verified: true,
    });

    expect(mocks.findMarketingShopper).toHaveBeenCalledTimes(1);

    expect(mocks.createMarketingEvent).toHaveBeenCalledTimes(1);
    expect(mocks.createMarketingEvent).toHaveBeenCalledWith({
      data: {
        shopperId: shopper.id,
        eventType: "SHOPPER_EMAIL_VERIFIED",
        eventKey: `SHOPPER_EMAIL_VERIFIED:${shopper.id}`,
      },
    });

    expect(mocks.processWelcome).toHaveBeenCalledWith(shopper.id);
  });

  it("does not create a marketing event for an under-18 shopper", async () => {
    mocks.findMarketingShopper.mockResolvedValue({
      marketingConsent: true,
      marketingConsentAt: new Date("2026-11-11T12:00:00.000Z"),
      dateOfBirth: new Date("2010-01-01T00:00:00.000Z"),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mocks.createMarketingEvent).not.toHaveBeenCalled();
    expect(mocks.processWelcome).toHaveBeenCalledTimes(1);
  });

  it("does not create a marketing event without consent", async () => {
    mocks.findMarketingShopper.mockResolvedValue({
      marketingConsent: false,
      marketingConsentAt: null,
      dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mocks.createMarketingEvent).not.toHaveBeenCalled();
    expect(mocks.processWelcome).toHaveBeenCalledTimes(1);
  });

  it("does not create a marketing event after consent withdrawal", async () => {
    mocks.findMarketingShopper.mockResolvedValue({
      marketingConsent: false,
      marketingConsentAt: new Date("2026-11-11T12:00:00.000Z"),
      dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mocks.createMarketingEvent).not.toHaveBeenCalled();
    expect(mocks.processWelcome).toHaveBeenCalledTimes(1);
  });

  it("does not create a marketing event without date of birth", async () => {
    mocks.findMarketingShopper.mockResolvedValue({
      marketingConsent: true,
      marketingConsentAt: new Date("2026-11-11T12:00:00.000Z"),
      dateOfBirth: null,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mocks.createMarketingEvent).not.toHaveBeenCalled();
    expect(mocks.processWelcome).toHaveBeenCalledTimes(1);
  });

  it("does not create a duplicate event for an already-verified shopper", async () => {
    mocks.findShopper.mockResolvedValue({
      ...shopper,
      emailVerifiedAt: FIXED_NOW,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      alreadyVerified: true,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.createMarketingEvent).not.toHaveBeenCalled();
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });

  it("does not create a marketing event for an incorrect code", async () => {
    mocks.verifyCode.mockReturnValue(false);

    mocks.findMarketingShopper.mockResolvedValue({
      marketingConsent: true,
      marketingConsentAt: new Date("2026-11-11T12:00:00.000Z"),
      dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(mocks.createMarketingEvent).not.toHaveBeenCalled();
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });

  it("propagates marketing event creation failure from the verification transaction", async () => {
    mocks.findMarketingShopper.mockResolvedValue({
      marketingConsent: true,
      marketingConsentAt: new Date("2026-11-11T12:00:00.000Z"),
      dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
    });

    mocks.createMarketingEvent.mockRejectedValue(
      new Error("Mock marketing event database failure")
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Something went wrong.",
    });

    expect(mocks.createMarketingEvent).toHaveBeenCalledTimes(1);
    expect(mocks.processWelcome).not.toHaveBeenCalled();
  });
});
