import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { reconcileNewsletterWelcomeEvent } from "./reconcileNewsletterWelcomeEvent";

const eventId = "event-security-1";
const subscriberId = "subscriber-security-1";
const generation = 2;
const recipient = "shopper@example.com";

const eventKey = `newsletter-welcome:${subscriberId}:${generation}`;

const verifiedEvidence = {
  outcome: "MATCHED" as const,
  eventId,
  eventKey,
  subscriberId,
  subscriptionGeneration: generation,
  recipient,
  providerMessageId: "provider-security-1",
};

const event = {
  id: eventId,
  status: "UNKNOWN",
  providerMessageId: null,
  eventKey,
  subscriberId,
  subscriptionGeneration: generation,
  subscriber: {
    id: subscriberId,
    email: recipient,
    subscriptionGeneration: generation,
    status: "subscribed",
  },
};

const tx = {
  $queryRaw: mocks.queryRaw,
  newsletterWelcomeEvent: {
    findUnique: mocks.findUnique,
    updateMany: mocks.updateMany,
  },
  newsletterWelcomeReconciliationAudit: {
    create: mocks.auditCreate,
  },
};

const db = {
  $transaction: mocks.transaction,
} as unknown as Parameters<typeof reconcileNewsletterWelcomeEvent>[0];

function request(
  evidence: unknown,
  overrides: Record<string, unknown> = {}
) {
  return {
    eventId,
    adminId: "verified-admin-security-1",
    evidenceReference: "Independent provider evidence review",
    reason: "Investigated the UNKNOWN newsletter welcome event.",
    evidence,
    ...overrides,
  } as Parameters<typeof reconcileNewsletterWelcomeEvent>[1];
}

describe("newsletter welcome reconciliation security contract", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx)
    );

    mocks.queryRaw.mockResolvedValue([{ id: eventId }]);
    mocks.findUnique.mockResolvedValue(structuredClone(event));
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: "audit-security-1" });
  });

  it("rejects administrator-supplied ACCEPTED without independent verification", async () => {
    const result = await reconcileNewsletterWelcomeEvent(
      db,
      request({
        outcome: "ACCEPTED",
        providerMessageId: "unverified-provider-id",
      })
    );

    expect(result).toEqual({ outcome: "CONFLICT" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("rejects administrator-supplied NOT_ACCEPTED without independent verification", async () => {
    const result = await reconcileNewsletterWelcomeEvent(
      db,
      request({ outcome: "NOT_ACCEPTED" })
    );

    expect(result).toEqual({ outcome: "CONFLICT" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong event ID", { eventId: "different-event" }],
    ["wrong event key", { eventKey: "different-event-key" }],
    ["wrong subscriber", { subscriberId: "different-subscriber" }],
    ["wrong generation", { subscriptionGeneration: 99 }],
    ["wrong recipient", { recipient: "other@example.com" }],
  ])("rejects verified evidence with %s", async (_name, changes) => {
    const result = await reconcileNewsletterWelcomeEvent(
      db,
      request({
        ...verifiedEvidence,
        ...changes,
      })
    );

    expect(result).toEqual({ outcome: "CONFLICT" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["changed event key", { eventKey: "changed-event-key" }],
    ["changed subscriber", { subscriberId: "different-subscriber" }],
    ["changed generation", { subscriptionGeneration: 3 }],
    ["changed recipient", {
      subscriber: {
        ...event.subscriber,
        email: "changed@example.com",
      },
    }],
    ["changed subscriber generation", {
      subscriber: {
        ...event.subscriber,
        subscriptionGeneration: 3,
      },
    }],
    ["unsubscribed subscriber", {
      subscriber: {
        ...event.subscriber,
        status: "unsubscribed",
      },
    }],
  ])("rejects changed database identity: %s", async (_name, changes) => {
    mocks.findUnique.mockResolvedValue({
      ...structuredClone(event),
      ...changes,
    });

    const result = await reconcileNewsletterWelcomeEvent(
      db,
      request(verifiedEvidence)
    );

    expect(result).toEqual({ outcome: "CONFLICT" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["inconclusive", { outcome: "INCONCLUSIVE" }],
    ["mismatch", { outcome: "MISMATCH" }],
    ["unavailable", { outcome: "UNAVAILABLE" }],
  ])("does not reconcile %s evidence", async (_name, evidence) => {
    const result = await reconcileNewsletterWelcomeEvent(
      db,
      request(evidence)
    );

    expect(result).toEqual({ outcome: "CONFLICT" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("rejects an already SENT event", async () => {
    mocks.findUnique.mockResolvedValue({
      ...structuredClone(event),
      status: "SENT",
    });

    const result = await reconcileNewsletterWelcomeEvent(
      db,
      request(verifiedEvidence)
    );

    expect(result).toEqual({ outcome: "CONFLICT" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("rejects an already CANCELLED event", async () => {
    mocks.findUnique.mockResolvedValue({
      ...structuredClone(event),
      status: "CANCELLED",
    });

    const result = await reconcileNewsletterWelcomeEvent(
      db,
      request(verifiedEvidence)
    );

    expect(result).toEqual({ outcome: "CONFLICT" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
