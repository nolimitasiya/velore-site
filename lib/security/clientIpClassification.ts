import { isIP } from "node:net";

export type ClientIpClassification =
  | {
      status: "TRUSTED" | "UNVERIFIED";
      candidate: string;
      source: "x-forwarded-for";
    }
  | {
      status: "UNAVAILABLE";
      candidate: null;
      source: null;
    };

export function classifyClientIp(
  req: Request,
): ClientIpClassification {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (!forwardedFor || forwardedFor.includes(",")) {
    return {
      status: "UNAVAILABLE",
      candidate: null,
      source: null,
    };
  }

  const candidate = forwardedFor.trim();

  if (!isIP(candidate)) {
    return {
      status: "UNAVAILABLE",
      candidate: null,
      source: null,
    };
  }

  return {
    status:
      process.env.VERCEL === "1"
        ? "TRUSTED"
        : "UNVERIFIED",
    candidate,
    source: "x-forwarded-for",
  };
}