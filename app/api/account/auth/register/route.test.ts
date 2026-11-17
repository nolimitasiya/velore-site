import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  findShopper: vi.fn(),
  createShopper: vi.fn(),
  createVerification: vi.fn(),
  updateVerification: vi.fn(),
  transaction: vi.fn(),
  hashPassword: vi.fn(),
  sendVerification: vi.fn(),
  createSession: vi.fn(),
  setSessionCookie: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopper: {
      findUnique: mocks.findShopper,
    },
    shopperEmailVerification: {
      updateMany: mocks.updateVerification,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.hashPassword,
  },
}));

vi.mock("@/lib/email/sendShopperEmailVerificationCode", () => ({
  sendShopperEmailVerificationCode: mocks.sendVerification,
}));

vi.mock("@/lib/auth/ShopperSession", () => ({
  createShopperSession: mocks.createSession,
  setShopperSessionCookie: mocks.setSessionCookie,
}));

vi.mock("@/lib/auth/shopperEmailVerificationCode", () => ({
  generateShopperEmailVerificationCode: vi.fn(
    () => "123456",
  ),
  hashShopperEmailVerificationCode: vi.fn(
    () => "mocked-verification-code-hash",
  ),
  getShopperEmailVerificationExpiry: vi.fn(
    () => new Date("2026-11-11T12:10:00.000Z"),
  ),
}));
import { POST } from "./route";

const FIXED_NOW = new Date("2026-11-11T12:00:00.000Z");

const validRegistration = {
  email: "consent-test@example.test",
  password: "SecurePassword123!",
  firstName: "Test",
  lastName: "Shopper",
  dateOfBirth: "2000-01-01",
};

function makeRequest(body: Record<string, unknown>) {
  const request = new Request(
    "http://localhost:3000/api/account/auth/register",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  // The registration handler only needs the request's
  // JSON body and its country-selection cookie.
  Object.defineProperty(request, "cookies", {
    value: {
      get: vi.fn(() => undefined),
    },
  });

  return request as NextRequest;
}

async function register(overrides: Record<string, unknown> = {}) {
  return POST(
    makeRequest({
      ...validRegistration,
      ...overrides,
    }),
  );
}

function shopperCreationData() {
  expect(mocks.createShopper).toHaveBeenCalledTimes(1);

  return mocks.createShopper.mock.calls[0][0].data;
}

function expectNoAccountCreation() {
  expect(mocks.findShopper).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.createShopper).not.toHaveBeenCalled();
  expect(mocks.createVerification).not.toHaveBeenCalled();
  expect(mocks.sendVerification).not.toHaveBeenCalled();
  expect(mocks.createSession).not.toHaveBeenCalled();
}

describe("shopper registration marketing consent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);

    mocks.findShopper.mockResolvedValue(null);
    mocks.hashPassword.mockResolvedValue("mocked-password-hash");

    mocks.createShopper.mockImplementation(async ({ data }) => ({
      id: "shopper-consent-test-id",
      email: data.email,
      firstName: data.firstName,
    }));

    mocks.createVerification.mockResolvedValue({
      id: "verification-test-id",
    });

    mocks.updateVerification.mockResolvedValue({ count: 1 });
    mocks.sendVerification.mockResolvedValue(undefined);

    mocks.createSession.mockResolvedValue({
      token: "mock-session-token",
    });

    mocks.setSessionCookie.mockImplementation(() => undefined);

    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        shopper: {
          create: mocks.createShopper,
        },
        shopperEmailVerification: {
          create: mocks.createVerification,
        },
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("records explicit adult marketing consent", async () => {
    const response = await register({
      marketingConsent: true,
    });

    expect(response.status).toBe(200);

    expect(shopperCreationData()).toEqual(
      expect.objectContaining({
        marketingConsent: true,
        marketingConsentAt: expect.any(Date),
        marketingConsentSource: "REGISTRATION",
      }),
    );

    expect(shopperCreationData().marketingConsentAt).toEqual(FIXED_NOW);

    expect(mocks.createVerification).toHaveBeenCalledTimes(1);
    expect(mocks.sendVerification).toHaveBeenCalledTimes(1);
    expect(mocks.createSession).toHaveBeenCalledTimes(1);
  });

  it("records explicit refusal without consent metadata", async () => {
    const response = await register({
      marketingConsent: false,
    });

    expect(response.status).toBe(200);

    expect(shopperCreationData()).toEqual(
      expect.objectContaining({
        marketingConsent: false,
        marketingConsentAt: null,
        marketingConsentSource: null,
      }),
    );
  });

  it("defaults omitted marketing consent to false", async () => {
    const response = await register();

    expect(response.status).toBe(200);

    expect(shopperCreationData()).toEqual(
      expect.objectContaining({
        marketingConsent: false,
        marketingConsentAt: null,
        marketingConsentSource: null,
      }),
    );
  });

  it("rejects marketing consent one day before age 18", async () => {
    const response = await register({
      dateOfBirth: "2008-11-12",
      marketingConsent: true,
    });

    expect(response.status).toBe(400);
    expectNoAccountCreation();
  });

  it("accepts marketing consent on the 18th birthday", async () => {
    const response = await register({
      dateOfBirth: "2008-11-11",
      marketingConsent: true,
    });

    expect(response.status).toBe(200);
    expect(shopperCreationData().marketingConsent).toBe(true);
  });

  it("allows a 13-year-old to register without marketing consent", async () => {
    const response = await register({
      dateOfBirth: "2013-11-11",
      marketingConsent: false,
    });

    expect(response.status).toBe(200);
    expect(shopperCreationData().marketingConsent).toBe(false);
  });

  it("rejects registration below age 13", async () => {
    const response = await register({
      dateOfBirth: "2013-11-12",
      marketingConsent: false,
    });

    expect(response.status).toBe(400);
    expectNoAccountCreation();
  });

  it.each([
    ["string true", "true"],
    ["string false", "false"],
    ["number", 1],
    ["null", null],
    ["object", { accepted: true }],
    ["array", [true]],
  ])("rejects invalid consent value: %s", async (_label, value) => {
    const response = await register({
      marketingConsent: value,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid marketing consent value.",
    });

    expectNoAccountCreation();
  });

  it("does not send verification email for rejected underage consent", async () => {
    const response = await register({
      dateOfBirth: "2010-01-01",
      marketingConsent: true,
    });

    expect(response.status).toBe(400);
    expect(mocks.sendVerification).not.toHaveBeenCalled();
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
    expectNoAccountCreation();
  });

  it("creates the verification challenge before sending the mocked email", async () => {
    const response = await register({
      marketingConsent: true,
    });

    expect(response.status).toBe(200);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.createShopper).toHaveBeenCalledTimes(1);
    expect(mocks.createVerification).toHaveBeenCalledTimes(1);
    expect(mocks.sendVerification).toHaveBeenCalledTimes(1);

    expect(
      mocks.createVerification.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mocks.sendVerification.mock.invocationCallOrder[0],
    );
  });

  it("does not create a shopper when the account already exists", async () => {
    mocks.findShopper.mockResolvedValue({
      id: "existing-shopper",
    });

    const response = await register({
      marketingConsent: true,
    });

    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.createShopper).not.toHaveBeenCalled();
    expect(mocks.sendVerification).not.toHaveBeenCalled();
  });

  it("rejects an invalid calendar date", async () => {
    const response = await register({
      dateOfBirth: "2000-02-30",
      marketingConsent: true,
    });

    expect(response.status).toBe(400);
    expectNoAccountCreation();
  });
});