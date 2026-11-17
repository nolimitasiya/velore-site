import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  validate: vi.fn(),
  prepare: vi.fn(),
  checkConsent: vi.fn(),
  complete: vi.fn(),
  send: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("./claimNewsletterWelcomeEvent", () => ({
  claimNewsletterWelcomeEvent: mocks.claim,
}));

vi.mock("./validateClaimedNewsletterWelcomeEvent", () => ({
  validateClaimedNewsletterWelcomeEvent: mocks.validate,
}));

vi.mock("./transitionNewsletterWelcomeEvent", () => ({
  prepareNewsletterWelcomeSubmission: mocks.prepare,
}));

vi.mock("./checkNewsletterWelcomeConsentBeforeSend", () => ({
  checkNewsletterWelcomeConsentBeforeSend: mocks.checkConsent,
}));

vi.mock("./completeNewsletterWelcomeEvent", () => ({
  completeNewsletterWelcomeEvent: mocks.complete,
}));

vi.mock("@/lib/resend/templates/marketing/newsletterWelcome", () => ({
  sendNewsletterWelcomeEmail: mocks.send,
}));

import { processOneNewsletterWelcomeEvent } from "./processNewsletterWelcomeEvent";

function makeDb(updateCount = 1) {
  const db = {
    newsletterWelcomeEvent: {
      updateMany: vi.fn().mockResolvedValue({
        count: updateCount,
      }),
    },
  };

  return db;
}

async function run(db: ReturnType<typeof makeDb>) {
  return processOneNewsletterWelcomeEvent(
    db as unknown as PrismaClient,
    { enableProviderSubmission: true }
  );
}

describe("newsletter welcome worker final consent safety", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.claim.mockResolvedValue({
      id: "event-1",
      claimToken: "claim-1",
    });

    mocks.validate.mockResolvedValue({
      status: "READY",
    });

    mocks.prepare.mockResolvedValue({
      status: "READY",
      email: "shopper@example.invalid",
      unsubscribeToken: "unsubscribe-1",
      eventKey: "newsletter-welcome:event-1:0",
    });

    mocks.checkConsent.mockResolvedValue({
      status: "READY",
    });

    mocks.send.mockResolvedValue({
      id: "fictional-provider-id",
    });

    mocks.complete.mockResolvedValue(true);
  });

  it("cancels after consent withdrawal without sending", async () => {
    const db = makeDb();

    mocks.checkConsent.mockResolvedValue({
      status: "BLOCKED",
    });

    await expect(run(db)).resolves.toEqual({
      status: "CANCELLED",
    });

    expect(db.newsletterWelcomeEvent.updateMany).toHaveBeenCalledWith({
      where: {
        id: "event-1",
        status: "SUBMITTING",
        claimToken: "claim-1",
      },
      data: {
        status: "CANCELLED",
        claimToken: null,
        claimedAt: null,
        nextAttemptAt: null,
      },
    });

    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("does not send when the final consent database check fails", async () => {
    const db = makeDb();

    mocks.checkConsent.mockRejectedValue(
      new Error("Simulated database failure")
    );

    await expect(run(db)).resolves.toEqual({
      status: "UNKNOWN",
    });

    expect(db.newsletterWelcomeEvent.updateMany).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("does not send when claim ownership conflicts", async () => {
    const db = makeDb();

    mocks.checkConsent.mockResolvedValue({
      status: "CONFLICT",
    });

    await expect(run(db)).resolves.toEqual({
      status: "CONFLICT",
    });

    expect(db.newsletterWelcomeEvent.updateMany).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("does not send when cancellation loses its claim", async () => {
    const db = makeDb(0);

    mocks.checkConsent.mockResolvedValue({
      status: "BLOCKED",
    });

    await expect(run(db)).resolves.toEqual({
      status: "CONFLICT",
    });

    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});