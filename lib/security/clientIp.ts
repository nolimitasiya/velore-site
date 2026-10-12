import "server-only";

import { isIP } from "node:net";

/**
 * Returns a candidate client IP only in a Vercel runtime.
 *
 * IMPORTANT:
 * This function must not be used for security enforcement until
 * the deployment's proxy/header trust boundary has been verified.
 */
export function getVercelClientIp(req: Request): string | null {
  if (process.env.VERCEL !== "1") {
    return null;
  }

  const forwardedFor = req.headers.get("x-forwarded-for");

  if (!forwardedFor) {
    return null;
  }

  // Do not accept a multi-hop chain without an explicit trusted-proxy policy.
  if (forwardedFor.includes(",")) {
    return null;
  }

  const candidate = forwardedFor.trim();

  if (!isIP(candidate)) {
    return null;
  }

  return candidate;
}
