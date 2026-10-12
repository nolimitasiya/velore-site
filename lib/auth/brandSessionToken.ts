import "server-only";
import crypto from "node:crypto";

const SESSION_DURATION_SECONDS = 60 * 60 * 12;

type BrandSessionPayload = {
  userId: string;
  expiresAt: number;
};

function getSessionSecret(): string {
  const secret = process.env.BRAND_SESSION_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "BRAND_SESSION_SECRET must contain at least 32 bytes."
    );
  }

  return secret;
}

function sign(value: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

export function createBrandSessionToken(userId: string): string {
  const payload: BrandSessionPayload = {
    userId,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyBrandSessionToken(
  token: string
): BrandSessionPayload | null {
  const parts = token.split(".");

  if (parts.length !== 2) return null;

  const [encodedPayload, suppliedSignature] = parts;

  if (!encodedPayload || !suppliedSignature) return null;

  const expectedSignature = sign(encodedPayload);

  const supplied = Buffer.from(suppliedSignature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");

  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as BrandSessionPayload;

    if (
      typeof payload.userId !== "string" ||
      !payload.userId ||
      typeof payload.expiresAt !== "number" ||
      !Number.isSafeInteger(payload.expiresAt) ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}