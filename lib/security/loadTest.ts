import type { NextRequest } from "next/server";

const LOAD_TEST_HEADER =
  "x-veilora-load-test";

export function isLoadTestRequest(
  req: NextRequest
): boolean {
  const expectedSecret =
    process.env.LOAD_TEST_HEADER_SECRET?.trim();

  /*
   * Fail closed.
   *
   * If the production environment variable
   * has not been configured, no request can
   * accidentally be classified as load-test
   * traffic.
   */
  if (!expectedSecret) {
    return false;
  }

  const providedSecret =
    req.headers
      .get(LOAD_TEST_HEADER)
      ?.trim();

  if (!providedSecret) {
    return false;
  }

  return providedSecret === expectedSecret;
}