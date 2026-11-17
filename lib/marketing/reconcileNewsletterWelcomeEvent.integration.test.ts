import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

const providerMocks = vi.hoisted(() => ({
  assess: vi.fn(),
}));

vi.mock("./assessNewsletterWelcomeProviderEvidence", () => ({
  assessNewsletterWelcomeProviderEvidence: providerMocks.assess,
}));

import { reconcileNewsletterWelcomeEvent } from "./reconcileNewsletterWelcomeEvent";
import { requireLocalMarketingTestDb } from "../testing/requireLocalMarketingTestDb";

const EXPECTED_DATABASE = "veilora_marketing_consent_test_20261111";
const EXPECTED_HOST = "127.0.0.1";
const EXPECTED_PORT = 5432;

let prisma: PrismaClient | undefined;
let databaseVerified = false;

const subscriberIds: string[] = [];

function requireExplicitLocalTestConfiguration(): void {
  if (process.env.RUN_LOCAL_MARKETING_DB_TESTS !== "1") {
    throw new Error("Marketing database integration tests are disabled.");
  }

  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const value = process.env[name];

    if (!value) {
      throw new Error(`${name} is missing.`);
    }

    const url = new URL(value);

    if (
      !["postgresql:", "postgres:"].includes(url.protocol) ||
      url.hostname !== EXPECTED_HOST ||
      Number(url.port || "5432") !== EXPECTED_PORT ||
      decodeURIComponent(url.pathname.slice(1)) !== EXPECTED_DATABASE ||
      url.searchParams.has("host") ||
      url.searchParams.has("hostaddr") ||
      url.searchParams.has("service")
    ) {
      throw new Error(
        `${name} does not point to the isolated local marketing database.`
      );
    }
  }
}

function database(): PrismaClient {
  if (!databaseVerified || !prisma) {
    throw new Error("STOP: Marketing test database not verified.");
  }

  return prisma;
}

function request(eventId: string, providerMessageId: string) {
  return {
    eventId,
    providerMessageId,
    adminId: `fictional-admin-${randomUUID()}`,
    evidenceReference: `fictional-evidence-${randomUUID()}`,
    reason: "Isolated reconciliation integration test.",
  };
}

async function createUnknownEvent() {
  const db = database();

  const subscriber = await db.newsletterSubscriber.create({
    data: {
      email: `fictional-reconciliation-${randomUUID()}@example.invalid`,
      status: "subscribed",
      subscriptionGeneration: 1,
      confirmedAt: new Date(),
      unsubscribedAt: null,
    },
  });

  subscriberIds.push(subscriber.id);

  const event = await db.newsletterWelcomeEvent.create({
    data: {
      subscriberId: subscriber.id,
      subscriptionGeneration: 1,
      eventKey: `newsletter-welcome:${subscriber.id}:1`,
      status: "UNKNOWN",
    },
  });

  return { subscriber, event };
}

function matchEvidence(
  subscriber: {
    id: string;
    email: string;
    subscriptionGeneration: number;
  },
  event: {
    id: string;
    eventKey: string;
  },
  providerMessageId: string
) {
  return {
    outcome: "MATCHED" as const,
    eventId: event.id,
    eventKey: event.eventKey,
    subscriberId: subscriber.id,
    subscriptionGeneration: subscriber.subscriptionGeneration,
    recipient: subscriber.email,
    providerMessageId,
  };
}

async function auditsFor(eventId: string) {
  return database().newsletterWelcomeReconciliationAudit.findMany({
    where: { welcomeEventId: eventId },
    orderBy: { createdAt: "asc" },
  });
}

async function assertUnknownAndUnaudited(eventId: string) {
  const event = await database().newsletterWelcomeEvent.findUniqueOrThrow({
    where: { id: eventId },
  });

  expect(event.status).toBe("UNKNOWN");
  expect(event.providerMessageId).toBeNull();
  expect(await auditsFor(eventId)).toHaveLength(0);
}

describe("newsletter welcome reconciliation PostgreSQL integration", () => {
  beforeAll(async () => {
    requireExplicitLocalTestConfiguration();

    prisma = new PrismaClient();

    await requireLocalMarketingTestDb(prisma);

    databaseVerified = true;
  });

  beforeEach(() => {
    providerMocks.assess.mockReset();
  });

  afterAll(async () => {
    try {
      if (databaseVerified && prisma && subscriberIds.length > 0) {
        // Revalidate the actual database connection before any cleanup.
        // If identity verification fails, do not delete test records.
        await requireLocalMarketingTestDb(prisma);

        const events = await prisma.newsletterWelcomeEvent.findMany({
          where: { subscriberId: { in: subscriberIds } },
          select: { id: true },
        });

        await prisma.newsletterWelcomeReconciliationAudit.deleteMany({
          where: {
            welcomeEventId: {
              in: events.map((event) => event.id),
            },
          },
        });

        await prisma.newsletterSubscriber.deleteMany({
          where: { id: { in: subscriberIds } },
        });
      }
    } finally {
      if (prisma) {
        await prisma.$disconnect();
      }
    }
  });

  it("reconciles independently matched evidence exactly once", async () => {
    const { subscriber, event } = await createUnknownEvent();
    const providerMessageId = `fictional-provider-${randomUUID()}`;

    providerMocks.assess.mockResolvedValue(
      matchEvidence(subscriber, event, providerMessageId)
    );

    const result = await reconcileNewsletterWelcomeEvent(
      database(),
      request(event.id, providerMessageId)
    );

    expect(result).toEqual({
      outcome: "RECONCILED",
      status: "SENT",
    });

    const updated = await database().newsletterWelcomeEvent.findUniqueOrThrow({
      where: { id: event.id },
    });

    expect(updated.status).toBe("SENT");
    expect(updated.providerMessageId).toBe(providerMessageId);
    expect(updated.submittedAt).not.toBeNull();

    const audits = await auditsFor(event.id);

    expect(audits).toHaveLength(1);
    expect(audits[0].previousStatus).toBe("UNKNOWN");
    expect(audits[0].resultingStatus).toBe("SENT");
    expect(audits[0].evidenceOutcome).toBe("MATCHED");
    expect(audits[0].providerMessageId).toBe(providerMessageId);
  });

  it.each([
    ["inconclusive", "INCONCLUSIVE"],
    ["mismatched", "MISMATCH"],
  ])("rejects %s provider evidence", async (_name, outcome) => {
    const { event } = await createUnknownEvent();

    providerMocks.assess.mockResolvedValue({
      outcome,
      reason: "TEST_EVIDENCE_REJECTED",
    });

    const result = await reconcileNewsletterWelcomeEvent(
      database(),
      request(event.id, `fictional-provider-${randomUUID()}`)
    );

    expect(result).toEqual({ outcome: "CONFLICT" });

    await assertUnknownAndUnaudited(event.id);
  });

  it("rejects an unsubscribed subscriber", async () => {
    const { subscriber, event } = await createUnknownEvent();
    const providerMessageId = `fictional-provider-${randomUUID()}`;

    providerMocks.assess.mockResolvedValue(
      matchEvidence(subscriber, event, providerMessageId)
    );

    await database().newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: "unsubscribed",
        unsubscribedAt: new Date(),
      },
    });

    const result = await reconcileNewsletterWelcomeEvent(
      database(),
      request(event.id, providerMessageId)
    );

    expect(result).toEqual({ outcome: "CONFLICT" });

    await assertUnknownAndUnaudited(event.id);
  });

  it("rejects a changed subscription generation", async () => {
    const { subscriber, event } = await createUnknownEvent();
    const providerMessageId = `fictional-provider-${randomUUID()}`;

    providerMocks.assess.mockResolvedValue(
      matchEvidence(subscriber, event, providerMessageId)
    );

    await database().newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { subscriptionGeneration: 2 },
    });

    const result = await reconcileNewsletterWelcomeEvent(
      database(),
      request(event.id, providerMessageId)
    );

    expect(result).toEqual({ outcome: "CONFLICT" });

    await assertUnknownAndUnaudited(event.id);
  });

  it("rejects reconciliation when the event is already SENT", async () => {
    const { subscriber, event } = await createUnknownEvent();
    const providerMessageId = `fictional-provider-${randomUUID()}`;

    await database().newsletterWelcomeEvent.update({
      where: { id: event.id },
      data: {
        status: "SENT",
        providerMessageId,
      },
    });

    providerMocks.assess.mockResolvedValue(
      matchEvidence(subscriber, event, providerMessageId)
    );

    const result = await reconcileNewsletterWelcomeEvent(
      database(),
      request(event.id, providerMessageId)
    );

    expect(result).toEqual({ outcome: "CONFLICT" });
    expect(await auditsFor(event.id)).toHaveLength(0);
  });

  it("allows at most one concurrent reconciliation", async () => {
    const { subscriber, event } = await createUnknownEvent();
    const providerMessageId = `fictional-provider-${randomUUID()}`;

    providerMocks.assess.mockResolvedValue(
      matchEvidence(subscriber, event, providerMessageId)
    );

    const results = await Promise.all([
      reconcileNewsletterWelcomeEvent(
        database(),
        request(event.id, providerMessageId)
      ),
      reconcileNewsletterWelcomeEvent(
        database(),
        request(event.id, providerMessageId)
      ),
    ]);

    expect(
      results.filter((result) => result.outcome === "RECONCILED")
    ).toHaveLength(1);

    expect(
      results.filter((result) => result.outcome === "CONFLICT")
    ).toHaveLength(1);

    expect(await auditsFor(event.id)).toHaveLength(1);
  });

  it("rolls back the event update when audit insertion fails", async () => {
    const { subscriber, event } = await createUnknownEvent();
    const providerMessageId = `fictional-provider-${randomUUID()}`;

    providerMocks.assess.mockResolvedValue(
      matchEvidence(subscriber, event, providerMessageId)
    );

    let auditInsertionAttempted = false;

    const db = database();

    const wrappedDatabase = {
      newsletterWelcomeEvent: db.newsletterWelcomeEvent,

      $transaction: async (
        callback: Parameters<PrismaClient["$transaction"]>[0]
      ) =>
        db.$transaction(async (tx) => {
          const wrapped = new Proxy(tx, {
            get(target, property, receiver) {
              if (property === "newsletterWelcomeReconciliationAudit") {
                return new Proxy(
                  target.newsletterWelcomeReconciliationAudit,
                  {
                    get(delegate, method, delegateReceiver) {
                      if (method === "create") {
                        return () => {
                          auditInsertionAttempted = true;
                          throw new Error(
                            "INJECTED_AUDIT_INSERTION_FAILURE"
                          );
                        };
                      }

                      return Reflect.get(
                        delegate,
                        method,
                        delegateReceiver
                      );
                    },
                  }
                );
              }

              return Reflect.get(target, property, receiver);
            },
          });

          return callback(wrapped);
        }),
    } as unknown as Pick<
      PrismaClient,
      "$transaction" | "newsletterWelcomeEvent"
    >;

    await expect(
      reconcileNewsletterWelcomeEvent(
        wrappedDatabase,
        request(event.id, providerMessageId)
      )
    ).rejects.toThrow("INJECTED_AUDIT_INSERTION_FAILURE");

    expect(auditInsertionAttempted).toBe(true);

    await assertUnknownAndUnaudited(event.id);
  });

  it("rejects legacy administrator-supplied evidence", async () => {
    const { event } = await createUnknownEvent();

    const result = await reconcileNewsletterWelcomeEvent(
      database(),
      {
        ...request(event.id, `fictional-provider-${randomUUID()}`),
        evidence: {
          outcome: "ACCEPTED",
        },
      }
    );

    expect(result).toEqual({ outcome: "CONFLICT" });
    expect(providerMocks.assess).not.toHaveBeenCalled();

    await assertUnknownAndUnaudited(event.id);
  });
});