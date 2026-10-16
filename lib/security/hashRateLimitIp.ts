import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

function canonicalizeIp(ip: string): string {
  const normalized = ip.trim().toLowerCase();
  const version = isIP(normalized);

  if (version === 4) {
    return normalized;
  }

  if (version === 6) {
    const url = new URL(`http://[${normalized}]/`);

    return url.hostname.slice(1, -1);
  }

  throw new Error("Invalid client IP");
}

export function hashRateLimitIp(ip: string): string {
  const key = process.env.RATE_LIMIT_IP_HMAC_KEY;

  if (!key || key.length < 32) {
    throw new Error(
      "RATE_LIMIT_IP_HMAC_KEY is not configured",
    );
  }

  const canonicalIp = canonicalizeIp(ip);

  return createHmac("sha256", key)
    .update(`rate-limit-ip:v1:${canonicalIp}`)
    .digest("hex");
}
