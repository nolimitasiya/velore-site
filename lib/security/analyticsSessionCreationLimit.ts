import "server-only";

import { classifyClientIp } from "@/lib/security/clientIpClassification";
import { hashRateLimitIp } from "@/lib/security/hashRateLimitIp";
import { checkRateLimit } from "@/lib/security/rateLimit";

export type AnalyticsSessionCreationLimitResult =
  | {
      status: "ALLOWED";
      resetAt: Date;
    }
  | {
      status: "BLOCKED";
      resetAt: Date;
    }
  | {
      status: "NOT_ENFORCED";
      reason: "DISABLED" | "CLIENT_IP_NOT_TRUSTED";
    };

export async function checkAnalyticsSessionCreationLimit(
  req: Request,
): Promise<AnalyticsSessionCreationLimitResult> {
  // Explicitly disabled until ingress trust and
  // production rollout prerequisites are verified.
  if (
    process.env.ANALYTICS_SESSION_CREATION_LIMIT_ENABLED !== "true"
  ) {
    return {
      status: "NOT_ENFORCED",
      reason: "DISABLED",
    };
  }

  const clientIp = classifyClientIp(req);

  if (clientIp.status !== "TRUSTED") {
    return {
      status: "NOT_ENFORCED",
      reason: "CLIENT_IP_NOT_TRUSTED",
    };
  }

  const result = await checkRateLimit({
    key: `analytics:session-creation:${hashRateLimitIp(
      clientIp.candidate,
    )}`,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });

  return {
    status: result.allowed ? "ALLOWED" : "BLOCKED",
    resetAt: result.resetAt,
  };
}
