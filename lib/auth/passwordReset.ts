import crypto from "crypto";

export function makeResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function minutesFromNow(mins: number) {
  return new Date(Date.now() + mins * 60 * 1000);
}
