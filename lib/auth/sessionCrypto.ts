import "server-only";

import crypto from "node:crypto";

export const SESSION_TOKEN_BYTES = 32;

export const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 12;

export const BRAND_SESSION_DURATION_SECONDS = 60 * 60 * 12;

export const ADMIN_IDLE_TIMEOUT_SECONDS = 60 * 30;

export const BRAND_IDLE_TIMEOUT_SECONDS = 60 * 60 * 2;

export const SESSION_ACTIVITY_UPDATE_INTERVAL_SECONDS = 60 * 5;

export function generateSessionToken(): string {
  return crypto.randomBytes(SESSION_TOKEN_BYTES).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export function sessionExpiresAt(
  durationSeconds: number
): Date {
  return new Date(Date.now() + durationSeconds * 1000);
}