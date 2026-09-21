import "server-only";

import { headers } from "next/headers";

const LOAD_TEST_HEADER =
  "x-veilora-load-test";

export async function isLoadTestPageRequest() {
  const expectedSecret =
    process.env.LOAD_TEST_HEADER_SECRET?.trim();

  if (!expectedSecret) {
    return false;
  }

  const requestHeaders = await headers();

  const providedSecret =
    requestHeaders
      .get(LOAD_TEST_HEADER)
      ?.trim();

  if (!providedSecret) {
    return false;
  }

  return providedSecret === expectedSecret;
}

export function createLoadTestTimer(
  route: string,
  enabled: boolean
) {
  const routeStartedAt =
    performance.now();

  async function measure<T>(
    section: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!enabled) {
      return operation();
    }

    const startedAt =
      performance.now();

    try {
      return await operation();
    } finally {
      const duration =
        performance.now() - startedAt;

      console.log(
        `[LOADTEST PERF] ${route} ${section}=${duration.toFixed(1)}ms`
      );
    }
  }

  function total() {
    if (!enabled) {
      return;
    }

    const duration =
      performance.now() - routeStartedAt;

    console.log(
      `[LOADTEST PERF] ${route} TOTAL=${duration.toFixed(1)}ms`
    );
  }

  return {
    measure,
    total,
  };
}