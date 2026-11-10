import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  generateShopperEmailVerificationCode,
  hashShopperEmailVerificationCode,
  verifyShopperEmailVerificationCode,
  getShopperEmailVerificationExpiry,
  isShopperEmailVerificationExpired,
  getShopperEmailVerificationRetryAfterSeconds,
  SHOPPER_EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES,
  SHOPPER_EMAIL_VERIFICATION_MAX_ATTEMPTS,
  SHOPPER_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
} from "./shopperEmailVerificationCode";

const TEST_SECRET = "veilora-email-verification-unit-test-secret-only";
const SHOPPER_ID = "00000000-0000-4000-8000-000000000001";
const EMAIL = "shopper@example.com";

describe("shopper email verification codes", () => {
  const previousSecret =
    process.env.SHOPPER_EMAIL_VERIFICATION_SECRET;

  beforeEach(() => {
    process.env.SHOPPER_EMAIL_VERIFICATION_SECRET =
      TEST_SECRET;
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.SHOPPER_EMAIL_VERIFICATION_SECRET;
    } else {
      process.env.SHOPPER_EMAIL_VERIFICATION_SECRET =
        previousSecret;
    }
  });

  it("generates exactly six digits", () => {
    for (let i = 0; i < 100; i++) {
      expect(
        generateShopperEmailVerificationCode()
      ).toMatch(/^\d{6}$/);
    }
  });

  it("supports leading-zero codes", () => {
    const code = "000123";

    const hash = hashShopperEmailVerificationCode(
      code,
      SHOPPER_ID,
      EMAIL
    );

    expect(
      verifyShopperEmailVerificationCode(
        code,
        hash,
        SHOPPER_ID,
        EMAIL
      )
    ).toBe(true);
  });

  it("produces a SHA-256 HMAC hash", () => {
    const hash = hashShopperEmailVerificationCode(
      "123456",
      SHOPPER_ID,
      EMAIL
    );

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("123456");
  });

  it("accepts the correct code", () => {
    const hash = hashShopperEmailVerificationCode(
      "123456",
      SHOPPER_ID,
      EMAIL
    );

    expect(
      verifyShopperEmailVerificationCode(
        "123456",
        hash,
        SHOPPER_ID,
        EMAIL
      )
    ).toBe(true);
  });

  it("rejects an incorrect code", () => {
    const hash = hashShopperEmailVerificationCode(
      "123456",
      SHOPPER_ID,
      EMAIL
    );

    expect(
      verifyShopperEmailVerificationCode(
        "654321",
        hash,
        SHOPPER_ID,
        EMAIL
      )
    ).toBe(false);
  });

  it("binds the code to the shopper ID", () => {
    const hash = hashShopperEmailVerificationCode(
      "123456",
      SHOPPER_ID,
      EMAIL
    );

    expect(
      verifyShopperEmailVerificationCode(
        "123456",
        hash,
        "00000000-0000-4000-8000-000000000002",
        EMAIL
      )
    ).toBe(false);
  });

  it("binds the code to the email address", () => {
    const hash = hashShopperEmailVerificationCode(
      "123456",
      SHOPPER_ID,
      EMAIL
    );

    expect(
      verifyShopperEmailVerificationCode(
        "123456",
        hash,
        SHOPPER_ID,
        "different@example.com"
      )
    ).toBe(false);
  });

  it("normalises email case and surrounding whitespace", () => {
    const hash = hashShopperEmailVerificationCode(
      "123456",
      SHOPPER_ID,
      " SHOPPER@EXAMPLE.COM "
    );

    expect(
      verifyShopperEmailVerificationCode(
        "123456",
        hash,
        SHOPPER_ID,
        EMAIL
      )
    ).toBe(true);
  });

  it("rejects malformed submitted codes", () => {
    const hash = hashShopperEmailVerificationCode(
      "123456",
      SHOPPER_ID,
      EMAIL
    );

    for (const code of [
      "12345",
      "1234567",
      "abcdef",
      "123 56",
      "",
    ]) {
      expect(
        verifyShopperEmailVerificationCode(
          code,
          hash,
          SHOPPER_ID,
          EMAIL
        )
      ).toBe(false);
    }
  });

  it("rejects malformed stored hashes", () => {
    expect(
      verifyShopperEmailVerificationCode(
        "123456",
        "invalid-hash",
        SHOPPER_ID,
        EMAIL
      )
    ).toBe(false);
  });

  it("rejects invalid codes before hashing", () => {
    expect(() =>
      hashShopperEmailVerificationCode(
        "12345",
        SHOPPER_ID,
        EMAIL
      )
    ).toThrow("Invalid verification code format.");
  });

  it("requires a configured verification secret", () => {
    delete process.env.SHOPPER_EMAIL_VERIFICATION_SECRET;

    expect(() =>
      hashShopperEmailVerificationCode(
        "123456",
        SHOPPER_ID,
        EMAIL
      )
    ).toThrow(
      "SHOPPER_EMAIL_VERIFICATION_SECRET must contain at least 32 characters."
    );
  });

  it("rejects a short verification secret", () => {
    process.env.SHOPPER_EMAIL_VERIFICATION_SECRET =
      "too-short";

    expect(() =>
      hashShopperEmailVerificationCode(
        "123456",
        SHOPPER_ID,
        EMAIL
      )
    ).toThrow();
  });

  it("sets expiry to 15 minutes", () => {
    const now = new Date("2026-11-09T12:00:00.000Z");

    expect(
      getShopperEmailVerificationExpiry(now).toISOString()
    ).toBe("2026-11-09T12:15:00.000Z");

    expect(
      SHOPPER_EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES
    ).toBe(15);
  });

  it("accepts a code before expiry", () => {
    const expiresAt =
      new Date("2026-11-09T12:15:00.000Z");

    expect(
      isShopperEmailVerificationExpired(
        expiresAt,
        new Date("2026-11-09T12:14:59.999Z")
      )
    ).toBe(false);
  });

  it("rejects a code at the expiry boundary", () => {
    const expiresAt =
      new Date("2026-11-09T12:15:00.000Z");

    expect(
      isShopperEmailVerificationExpired(
        expiresAt,
        new Date("2026-11-09T12:15:00.000Z")
      )
    ).toBe(true);
  });

  it("rejects a code after expiry", () => {
    const expiresAt =
      new Date("2026-11-09T12:15:00.000Z");

    expect(
      isShopperEmailVerificationExpired(
        expiresAt,
        new Date("2026-11-09T12:16:00.000Z")
      )
    ).toBe(true);
  });

  it("enforces a 60-second resend cooldown", () => {
    const sentAt = new Date("2026-11-09T12:00:00.000Z");

    expect(
      getShopperEmailVerificationRetryAfterSeconds(
        sentAt,
        new Date("2026-11-09T12:00:00.000Z")
      )
    ).toBe(60);

    expect(
      SHOPPER_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS
    ).toBe(60);
  });

  it("rounds remaining cooldown seconds upwards", () => {
    const sentAt = new Date("2026-11-09T12:00:00.000Z");

    expect(
      getShopperEmailVerificationRetryAfterSeconds(
        sentAt,
        new Date("2026-11-09T12:00:30.500Z")
      )
    ).toBe(30);
  });

  it("allows resend after cooldown", () => {
    const sentAt = new Date("2026-11-09T12:00:00.000Z");

    expect(
      getShopperEmailVerificationRetryAfterSeconds(
        sentAt,
        new Date("2026-11-09T12:01:00.000Z")
      )
    ).toBe(0);
  });

  it("never returns a negative cooldown", () => {
    const sentAt = new Date("2026-11-09T12:00:00.000Z");

    expect(
      getShopperEmailVerificationRetryAfterSeconds(
        sentAt,
        new Date("2026-11-09T12:10:00.000Z")
      )
    ).toBe(0);
  });

  it("defines a maximum of five verification attempts", () => {
    expect(
      SHOPPER_EMAIL_VERIFICATION_MAX_ATTEMPTS
    ).toBe(5);
  });
});