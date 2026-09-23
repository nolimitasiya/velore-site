import type { NextRequest } from "next/server";

import { isTrustedInternalRequest } from "@/lib/platform-health/internalRequest";

export function isLoadTestRequest(
  req: NextRequest
): boolean {
  return isTrustedInternalRequest(
    req,
    "LOAD_TEST"
  );
}