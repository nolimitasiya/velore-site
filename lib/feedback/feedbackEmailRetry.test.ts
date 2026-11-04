import { describe, expect, it } from "vitest";

import {
  FEEDBACK_EMAIL_LEASE_MS,
  FEEDBACK_EMAIL_MAX_ATTEMPTS,
  getFeedbackEmailRetryDecision,
} from "@/lib/feedback/feedbackEmailRetry";

describe("feedback email retry policy", () => {
  const now = new Date("2026-10-25T12:00:00.000Z");

  it("allows a maximum of five attempts", () => {
    expect(FEEDBACK_EMAIL_MAX_ATTEMPTS).toBe(5);
  });

  it("uses a two-minute processing lease", () => {
    expect(FEEDBACK_EMAIL_LEASE_MS).toBe(120_000);
  });

  it.each([
    [1, 60_000],
    [2, 300_000],
    [3, 900_000],
    [4, 3_600_000],
  ])(
    "schedules the correct retry delay after attempt %i",
    (attempts, expectedDelay) => {
      const result = getFeedbackEmailRetryDecision(
        attempts,
        now
      );

      expect(result.retry).toBe(true);

      if (!result.retry) {
        throw new Error("Expected a retry decision.");
      }

      expect(result.nextAttemptAt.getTime()).toBe(
        now.getTime() + expectedDelay
      );
    }
  );

  it("does not retry after attempt five", () => {
    expect(
      getFeedbackEmailRetryDecision(5, now)
    ).toEqual({
      retry: false,
      nextAttemptAt: null,
    });
  });

  it("does not retry beyond the maximum", () => {
    expect(
      getFeedbackEmailRetryDecision(6, now)
    ).toEqual({
      retry: false,
      nextAttemptAt: null,
    });
  });

  it.each([0, -1, 1.5, NaN, Infinity])(
    "rejects invalid attempt count %s",
    (attempts) => {
      expect(() =>
        getFeedbackEmailRetryDecision(attempts, now)
      ).toThrow(
        "Invalid feedback email attempt count."
      );
    }
  );

  it("does not mutate the supplied date", () => {
    const originalTime = now.getTime();

    getFeedbackEmailRetryDecision(1, now);

    expect(now.getTime()).toBe(originalTime);
  });
});