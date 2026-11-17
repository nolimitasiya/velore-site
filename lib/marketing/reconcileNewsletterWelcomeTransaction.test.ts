import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  assessor: vi.fn(),
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("./assessNewsletterWelcomeProviderEvidence", () => ({
  assessNewsletterWelcomeProviderEvidence: mocks.assessor,
}));

import { reconcileNewsletterWelcomeEvent } from "./reconcileNewsletterWelcomeEvent";

const eventId = "event-transaction-1";
const subscriberId = "subscriber-transaction-1";
const generation = 2;
const recipient = "shopper@example.com";
const providerMessageId = "provider-transaction-1";

const eventKey = `newsletter-welcome:${subscriberId}:${generation}`;

const assessment = {
  outcome: "MATCHED" as const,
  eventId,
  eventKey,
  subscriberId,
  subscriptionGeneration: generation,
  recipient,
  providerMessageId,
};

const event = {
  id: eventId,
  eventKey,
  subscriberId,
  subscriptionGeneration: generation,
  status: "UNKNOWN",
  providerMessageId: null,
};

const subscriber = {
  id: subscriberId,
  email: recipient,
  subscriptionGeneration: generation,
  status: "subscribed",
  confirmedAt: new Date("2026-11-15T10:00:00.000Z"),
  unsubscribedAt: null,
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
  newsletterWelcomeEvent: {
    findUnique: vi.fn(),
  },
} as unknown as Parameters<typeof reconcileNewsletterWelcomeEvent>[0];

const request = {
  eventId,
  adminId: "admin-transaction-1",
  evidenceReference: "Independent provider verification",
  reason: "Verified provider evidence for UNKNOWN event.",
  providerMessageId,
};

function queryText(strings: TemplateStringsArray): string {
  return Array.from(strings).join(" ");
}

describe("newsletter welcome reconciliation transaction security", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.assessor.mockResolvedValue(structuredClone(assessment));

    mocks.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx)
    );

    mocks.queryRaw.mockImplementation(
      async (strings: TemplateStringsArray) => {
        const sql = queryText(strings);

        if (sql.includes('FROM "NewsletterWelcomeEvent"')) {
          return [{ id: eventId }];
        }

        if (sql.includes('FROM "NewsletterSubscriber"')) {
          return [structuredClone(subscriber)];
        }

        throw new Error("Unexpected SQL query.");
      }
    );

    mocks.findUnique.mockResolvedValue(structuredClone(event));
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: "audit-transaction-1" });
  });

  it("reconciles independently verified evidence and creates one audit", async () => {
    const result = await reconcileNewsletterWelcomeEvent(db, request);

    expect(result).toEqual({
      outcome: "RECONCILED",
      status: "SENT",
    });

    expect(mocks.assessor).toHaveBeenCalledExactlyOnceWith(
      db,
      {
        eventId,
        providerMessageId,
      }
    );

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.updateMany).toHaveBeenCalledOnce();
    expect(mocks.auditCreate).toHaveBeenCalledOnce();

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: eventId,
        status: "UNKNOWN",
        providerMessageId: null,
      },
      data: expect.objectContaining({
        status: "SENT",
        providerMessageId,
      }),
    });

    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        welcomeEventId: eventId,
        previousStatus: "UNKNOWN",
        resultingStatus: "SENT",
        evidenceOutcome: "MATCHED",
        providerMessageId,
      }),
    });
  });

  it.each([
    ["inconclusive", { outcome: "INCONCLUSIVE", reason: "PROVIDER_UNAVAILABLE" }],
    ["mismatch", { outcome: "MISMATCH", reason: "RECIPIENT_MISMATCH" }],
  ])("does not open a transaction for %s evidence", async (_name, result) => {
    mocks.assessor.mockResolvedValue(result);

    await expect(
      reconcileNewsletterWelcomeEvent(db, request)
    ).resolves.toEqual({ outcome: "CONFLICT" });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["email change", { email: "changed@example.com" }],
    ["generation change", { subscriptionGeneration: 3 }],
    ["unsubscribe", {
      status: "unsubscribed",
      unsubscribedAt: new Date("2026-11-15T11:00:00.000Z"),
    }],
    ["missing confirmation", { confirmedAt: null }],
  ])("rejects subscriber %s after provider assessment", async (_name, changes) => {
    mocks.queryRaw.mockImplementation(
      async (strings: TemplateStringsArray) => {
        const sql = queryText(strings);

        if (sql.includes('FROM "NewsletterWelcomeEvent"')) {
          return [{ id: eventId }];
        }

        if (sql.includes('FROM "NewsletterSubscriber"')) {
          return [{ ...structuredClone(subscriber), ...changes }];
        }

        throw new Error("Unexpected SQL query.");
      }
    );

    await expect(
      reconcileNewsletterWelcomeEvent(db, request)
    ).resolves.toEqual({ outcome: "CONFLICT" });

    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("rejects an event that was reconciled after assessment", async () => {
    mocks.findUnique.mockResolvedValue({
      ...event,
      status: "SENT",
    });

    await expect(
      reconcileNewsletterWelcomeEvent(db, request)
    ).resolves.toEqual({ outcome: "CONFLICT" });

    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("rejects an event with a different stored provider ID", async () => {
    mocks.findUnique.mockResolvedValue({
      ...event,
      providerMessageId: "another-provider",
    });

    await expect(
      reconcileNewsletterWelcomeEvent(db, request)
    ).resolves.toEqual({ outcome: "CONFLICT" });

    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("does not audit when the conditional update loses a race", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      reconcileNewsletterWelcomeEvent(db, request)
    ).resolves.toEqual({ outcome: "CONFLICT" });

    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("propagates audit failure so the transaction can roll back", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("Audit insertion failed"));

    await expect(
      reconcileNewsletterWelcomeEvent(db, request)
    ).rejects.toThrow("Audit insertion failed");

    expect(mocks.updateMany).toHaveBeenCalledOnce();
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
  });

  it("assesses provider evidence before opening the transaction", async () => {
    const order: string[] = [];

    mocks.assessor.mockImplementation(async () => {
      order.push("assess");
      return structuredClone(assessment);
    });

    mocks.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => unknown) => {
        order.push("transaction");
        return callback(tx);
      }
    );

    await reconcileNewsletterWelcomeEvent(db, request);

    expect(order).toEqual(["assess", "transaction"]);
  });

  it("rejects legacy caller-provided evidence without provider assessment", async () => {
    await expect(
      reconcileNewsletterWelcomeEvent(db, {
        ...request,
        evidence: {
          outcome: "ACCEPTED",
          providerMessageId,
        },
      })
    ).resolves.toEqual({ outcome: "CONFLICT" });

    expect(mocks.assessor).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects missing provider ID without provider assessment", async () => {
    await expect(
      reconcileNewsletterWelcomeEvent(db, {
        ...request,
        providerMessageId: "",
      })
    ).resolves.toEqual({ outcome: "CONFLICT" });

    expect(mocks.assessor).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
