import { describe, expect, it } from "vitest";

import {
  NEWSLETTER_WELCOME_STALE_MONITORING_MS,
  getNewsletterWelcomeStaleMonitoringCutoff,
} from "./newsletterWelcomeMonitoringConfig";

describe("newsletter welcome monitoring configuration", () => {
  it("uses a 30-minute monitoring threshold", () => {
    expect(NEWSLETTER_WELCOME_STALE_MONITORING_MS).toBe(
      30 * 60 * 1000
    );
  });

  it("calculates the cutoff 30 minutes before the supplied time", () => {
    const now = new Date("2026-11-13T12:00:00.000Z");

    const cutoff = getNewsletterWelcomeStaleMonitoringCutoff(now);

    expect(cutoff.toISOString()).toBe(
      "2026-11-13T11:30:00.000Z"
    );
  });

  it("handles dates across a day boundary", () => {
    const now = new Date("2026-11-13T00:15:00.000Z");

    const cutoff = getNewsletterWelcomeStaleMonitoringCutoff(now);

    expect(cutoff.toISOString()).toBe(
      "2026-11-12T23:45:00.000Z"
    );
  });

  it("does not modify the supplied date", () => {
    const now = new Date("2026-11-13T12:00:00.000Z");

    const originalTime = now.getTime();

    const cutoff = getNewsletterWelcomeStaleMonitoringCutoff(now);

    expect(now.getTime()).toBe(originalTime);
    expect(cutoff).not.toBe(now);
  });

  it("rejects invalid dates", () => {
    const invalid = new Date(Number.NaN);

    expect(() =>
      getNewsletterWelcomeStaleMonitoringCutoff(invalid)
    ).toThrow("Invalid newsletter monitoring time.");
  });
});