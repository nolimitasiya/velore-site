import { describe, expect, it } from "vitest";

import {
  IMPRESSION_SESSION_RETRY_DELAY_MS,
  MAX_IMPRESSION_SESSION_RETRIES,
  shouldRetryImpressionSession,
} from "./impressionRetryPolicy";

describe("impression session retry policy", () => {
  it("uses a two-second delay", () => {
    expect(IMPRESSION_SESSION_RETRY_DELAY_MS).toBe(2000);
  });

  it("allows only one retry", () => {
    expect(MAX_IMPRESSION_SESSION_RETRIES).toBe(1);

    expect(
      shouldRetryImpressionSession(0, true),
    ).toBe(true);

    expect(
      shouldRetryImpressionSession(1, true),
    ).toBe(false);
  });

  it("does not retry after unmounting", () => {
    expect(
      shouldRetryImpressionSession(0, false),
    ).toBe(false);
  });

  it("rejects invalid retry counters", () => {
    expect(
      shouldRetryImpressionSession(-1, true),
    ).toBe(false);

    expect(
      shouldRetryImpressionSession(0.5, true),
    ).toBe(false);
  });
});
