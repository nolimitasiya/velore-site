import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export const SHOPPER_EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES = 15;
export const SHOPPER_EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
export const SHOPPER_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

export function generateShopperEmailVerificationCode(): string {
  return randomInt(0, 1_000_000)
    .toString()
    .padStart(6, "0");
}

function getVerificationSecret(): string {
  const secret =
    process.env.SHOPPER_EMAIL_VERIFICATION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SHOPPER_EMAIL_VERIFICATION_SECRET must contain at least 32 characters."
    );
  }

  return secret;
}

export function hashShopperEmailVerificationCode(
  code: string,
  shopperId: string,
  email: string
): string {
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Invalid verification code format.");
  }

  return createHmac(
    "sha256",
    getVerificationSecret()
  )
    .update(
      JSON.stringify([
        shopperId,
        email.trim().toLowerCase(),
        code,
      ])
    )
    .digest("hex");
}

export function verifyShopperEmailVerificationCode(
  submittedCode: string,
  expectedHash: string,
  shopperId: string,
  email: string
): boolean {
  if (!/^\d{6}$/.test(submittedCode)) {
    return false;
  }

  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) {
    return false;
  }

  const submittedHash =
    hashShopperEmailVerificationCode(
      submittedCode,
      shopperId,
      email
    );

  return timingSafeEqual(
    Buffer.from(submittedHash, "hex"),
    Buffer.from(expectedHash, "hex")
  );
}

export function getShopperEmailVerificationExpiry(
  now: Date = new Date()
): Date {
  return new Date(
    now.getTime() +
      SHOPPER_EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES *
        60 *
        1000
  );
}

export function isShopperEmailVerificationExpired(
  expiresAt: Date,
  now: Date = new Date()
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function getShopperEmailVerificationRetryAfterSeconds(
  sentAt: Date,
  now: Date = new Date()
): number {
  const cooldownEndsAt =
    sentAt.getTime() +
    SHOPPER_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS *
      1000;

  return Math.max(
    0,
    Math.ceil(
      (cooldownEndsAt - now.getTime()) / 1000
    )
  );
}