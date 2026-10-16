import { classifyClientIp } from "@/lib/security/clientIpClassification";
import { hashRateLimitIp } from "@/lib/security/hashRateLimitIp";
import { checkRateLimit } from "@/lib/security/rateLimit";

export type AnalyticsRateLimitEvent =
  | "brand-view"
  | "product-impression"
  | "product-view"
  | "search"
  | "wishlist";

type AnalyticsRateLimitResult =
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
      reason: "CLIENT_IP_NOT_TRUSTED";
    };

const LIMITS: Record<AnalyticsRateLimitEvent, number> = {
  "brand-view": 120,
  "product-impression": 600,
  "product-view": 120,
  search: 30,
  wishlist: 120,
};

export async function checkAnalyticsRateLimit(
  req: Request,
  event: AnalyticsRateLimitEvent,
): Promise<AnalyticsRateLimitResult> {
  const clientIp = classifyClientIp(req);

  if (clientIp.status !== "TRUSTED") {
    return {
      status: "NOT_ENFORCED",
      reason: "CLIENT_IP_NOT_TRUSTED",
    };
  }

  const result = await checkRateLimit({
    key: `analytics:${event}:${hashRateLimitIp(clientIp.candidate)}`,
    limit: LIMITS[event],
    windowMs: 60_000,
  });

  return {
    status: result.allowed ? "ALLOWED" : "BLOCKED",
    resetAt: result.resetAt,
  };
}