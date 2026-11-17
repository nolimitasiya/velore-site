import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("waitlist marketing safeguard", () => {
  const route = readFileSync(
    resolve(process.cwd(), "app/api/waitlist/route.ts"),
    "utf8"
  );

  it("does not automatically subscribe waitlist signups", () => {
    expect(route).not.toContain(
      "syncWaitlistSubscriberToKlaviyo"
    );
  });

  it("preserves waitlist registration", () => {
    expect(route).toContain(
      "prisma.waitlistSubscriber.create"
    );
  });

  it("preserves existing subscriber handling", () => {
    expect(route).toContain(
      "alreadyJoined: true"
    );
  });

  it("preserves acquisition attribution", () => {
    expect(route).toContain(
      "acquisitionSource:"
    );
    expect(route).toContain(
      "analyticsSessionId:"
    );
  });
});
