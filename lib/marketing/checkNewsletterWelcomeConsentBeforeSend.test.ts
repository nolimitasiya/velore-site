import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

import { checkNewsletterWelcomeConsentBeforeSend } from "./checkNewsletterWelcomeConsentBeforeSend";

function makeDb() {
  const db = {
    newsletterWelcomeEvent: {
      findUnique: vi.fn().mockResolvedValue({
        subscriberId: "subscriber-1",
        subscriptionGeneration: 2,
        status: "SUBMITTING",
        claimToken: "claim-1",
      }),
    },
    newsletterSubscriber: {
      findUnique: vi.fn().mockResolvedValue({
        email: "shopper@example.invalid",
        status: "subscribed",
        subscriptionGeneration: 2,
        unsubscribeToken: "unsubscribe-1",
        unsubscribedAt: null,
      }),
    },
    shopper: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    shopperMarketingConsentSync: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };

  return db;
}

function check(db: ReturnType<typeof makeDb>, claimToken = "claim-1") {
  return checkNewsletterWelcomeConsentBeforeSend(
    db as unknown as PrismaClient,
    "event-1",
    claimToken,
    "shopper@example.invalid",
    "unsubscribe-1"
  );
}

describe("pre-send newsletter welcome consent check", () => {
  it("allows valid consent", async () => {
    const db = makeDb();

    expect(await check(db)).toEqual({ status: "READY" });
  });

  it("blocks an unsubscribed subscriber", async () => {
    const db = makeDb();

    db.newsletterSubscriber.findUnique.mockResolvedValue({
      email: "shopper@example.invalid",
      status: "unsubscribed",
      subscriptionGeneration: 2,
      unsubscribeToken: "unsubscribe-1",
      unsubscribedAt: new Date(),
    });

    expect(await check(db)).toEqual({ status: "BLOCKED" });
  });

  it("blocks an outdated subscription generation", async () => {
    const db = makeDb();

    db.newsletterSubscriber.findUnique.mockResolvedValue({
      email: "shopper@example.invalid",
      status: "subscribed",
      subscriptionGeneration: 3,
      unsubscribeToken: "unsubscribe-1",
      unsubscribedAt: null,
    });

    expect(await check(db)).toEqual({ status: "BLOCKED" });
  });

  it("blocks withdrawn account marketing consent", async () => {
    const db = makeDb();

    db.shopper.findMany.mockResolvedValue([
      {
        id: "shopper-1",
        marketingConsent: false,
        marketingConsentVersion: 3,
      },
    ]);

    db.shopperMarketingConsentSync.findFirst.mockResolvedValue({
      reason: "ACCOUNT_OPT_OUT",
      consentVersion: 3,
    });

    expect(await check(db)).toEqual({ status: "BLOCKED" });
  });

  it("rejects an incorrect claim token", async () => {
    const db = makeDb();

    expect(await check(db, "wrong-claim")).toEqual({
      status: "CONFLICT",
    });
  });

  it("propagates database failures without permitting submission", async () => {
    const db = makeDb();

    db.newsletterWelcomeEvent.findUnique.mockRejectedValue(
      new Error("Simulated database failure")
    );

    await expect(check(db)).rejects.toThrow(
      "Simulated database failure"
    );
  });
});