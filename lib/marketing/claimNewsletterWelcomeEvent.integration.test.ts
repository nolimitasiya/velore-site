import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

import {
  claimNewsletterWelcomeEvent,
  NEWSLETTER_WELCOME_MAX_ATTEMPTS,
} from "./claimNewsletterWelcomeEvent";

const EXPECTED_DATABASE =
  "veilora_marketing_consent_test_20261111";

let prisma: PrismaClient;
let secondPrisma: PrismaClient;
let identityVerified = false;

const createdSubscriberIds: string[] = [];
const currentTestSubscriberIds: string[] = [];

function validateDatabaseUrl(value: string | undefined) {
  if (!value) {
    throw new Error("STOP: DATABASE_URL is missing.");
  }

  const url = new URL(value);

  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "5432" ||
    decodeURIComponent(url.username) !== "postgres" ||
    decodeURIComponent(url.pathname.slice(1)) !==
      EXPECTED_DATABASE
  ) {
    throw new Error(
      "STOP: Claim tests require the exact isolated PostgreSQL database."
    );
  }
}

async function verifyDatabaseIdentity(db: PrismaClient) {
  const rows = await db.$queryRaw<
    Array<{
      database_name: string;
      database_user: string;
      server_address: string | null;
      server_port: number | null;
    }>
  >`
    SELECT
      current_database()::text AS database_name,
      current_user::text AS database_user,
      host(inet_server_addr())::text AS server_address,
      inet_server_port()::integer AS server_port
  `;

  if (
    rows.length !== 1 ||
    rows[0].database_name !== EXPECTED_DATABASE ||
    rows[0].database_user !== "postgres" ||
    rows[0].server_address !== "127.0.0.1" ||
    rows[0].server_port !== 5432
  ) {
    throw new Error("STOP: PostgreSQL identity mismatch.");
  }
}

async function createEvent(
  label: string,
  options: {
    status?:
      | "PENDING"
      | "PROCESSING"
      | "SUBMITTING"
      | "SENT"
      | "FAILED"
      | "CANCELLED"
      | "UNKNOWN";
    attemptCount?: number;
    nextAttemptAt?: Date | null;
  } = {}
) {
  const subscriberId = randomUUID();

  const subscriber = await prisma.newsletterSubscriber.create({
    data: {
      id: subscriberId,
      email: `claim-${label}-${subscriberId}@example.invalid`,
      status: "subscribed",
      subscriptionGeneration: 0,
    },
  });

  createdSubscriberIds.push(subscriber.id);
  currentTestSubscriberIds.push(subscriber.id);

  const event = await prisma.newsletterWelcomeEvent.create({
    data: {
      subscriberId: subscriber.id,
      subscriptionGeneration: 0,
      eventKey: `newsletter-claim:${subscriber.id}:0`,
      status: options.status ?? "PENDING",
      attemptCount: options.attemptCount ?? 0,
      nextAttemptAt: options.nextAttemptAt ?? null,
    },
  });

  return event;
}

describe("newsletter welcome event atomic claim integration", () => {
  beforeAll(async () => {
    validateDatabaseUrl(process.env.DATABASE_URL);

    prisma = new PrismaClient();
    secondPrisma = new PrismaClient();

    await verifyDatabaseIdentity(prisma);
    await verifyDatabaseIdentity(secondPrisma);

    const existingCount = await prisma.newsletterWelcomeEvent.count();

    if (existingCount !== 0) {
      throw new Error(
        `STOP: Expected empty welcome queue; found ${existingCount} events.`
      );
    }

    identityVerified = true;
  });

  afterEach(async () => {
    if (!identityVerified || currentTestSubscriberIds.length === 0) {
      return;
    }

    const ids = [...currentTestSubscriberIds];

    await prisma.newsletterWelcomeEvent.deleteMany({
      where: {
        subscriberId: {
          in: ids,
        },
      },
    });

    await prisma.newsletterSubscriber.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    currentTestSubscriberIds.length = 0;
  });

  afterAll(async () => {
    try {
      if (identityVerified && createdSubscriberIds.length > 0) {
        await prisma.newsletterWelcomeEvent.deleteMany({
          where: {
            subscriberId: {
              in: createdSubscriberIds,
            },
          },
        });

        await prisma.newsletterSubscriber.deleteMany({
          where: {
            id: {
              in: createdSubscriberIds,
            },
          },
        });
      }
    } finally {
      if (secondPrisma) {
        await secondPrisma.$disconnect();
      }

      if (prisma) {
        await prisma.$disconnect();
      }
    }
  });

  it("claims one pending event atomically", async () => {
    const event = await createEvent("pending");

    const claimed = await claimNewsletterWelcomeEvent(prisma);

    expect(claimed).not.toBeNull();
    expect(claimed?.id).toBe(event.id);
    expect(claimed?.subscriberId).toBe(event.subscriberId);
    expect(claimed?.attemptCount).toBe(1);
    expect(claimed?.claimToken).toBeTruthy();

    const stored =
      await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
        where: { id: event.id },
      });

    expect(stored.status).toBe("PROCESSING");
    expect(stored.attemptCount).toBe(1);
    expect(stored.claimToken).toBe(claimed?.claimToken);
    expect(stored.claimedAt).not.toBeNull();
    expect(stored.nextAttemptAt).toBeNull();
  });

  it("prevents two concurrent workers from claiming one event", async () => {
    const event = await createEvent("concurrent");

    const [first, second] = await Promise.all([
      claimNewsletterWelcomeEvent(prisma),
      claimNewsletterWelcomeEvent(secondPrisma),
    ]);

    const results = [first, second];

    const successful = results.filter(
      (result) => result?.id === event.id
    );

    expect(successful).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);

    const stored =
      await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
        where: { id: event.id },
      });

    expect(stored.status).toBe("PROCESSING");
    expect(stored.attemptCount).toBe(1);
    expect(stored.claimToken).toBe(successful[0]?.claimToken);
  });

  it("does not claim a failed event before its retry time", async () => {
    const event = await createEvent("future", {
      status: "FAILED",
      attemptCount: 1,
      nextAttemptAt: new Date(Date.now() + 60_000),
    });

    const claimed = await claimNewsletterWelcomeEvent(prisma);

    expect(claimed?.id).not.toBe(event.id);

    const stored =
      await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
        where: { id: event.id },
      });

    expect(stored.status).toBe("FAILED");
    expect(stored.attemptCount).toBe(1);
  });

  it("claims a failed event when its retry time is due", async () => {
    const event = await createEvent("due", {
      status: "FAILED",
      attemptCount: 1,
      nextAttemptAt: new Date(Date.now() - 60_000),
    });

    const claimed = await claimNewsletterWelcomeEvent(prisma);

    expect(claimed?.id).toBe(event.id);
    expect(claimed?.attemptCount).toBe(2);

    const stored =
      await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
        where: { id: event.id },
      });

    expect(stored.status).toBe("PROCESSING");
    expect(stored.nextAttemptAt).toBeNull();
  });

  it("does not claim a failed event without a scheduled retry", async () => {
    const event = await createEvent("unscheduled", {
      status: "FAILED",
      attemptCount: 1,
      nextAttemptAt: null,
    });

    const claimed = await claimNewsletterWelcomeEvent(prisma);

    expect(claimed?.id).not.toBe(event.id);

    const stored =
      await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
        where: { id: event.id },
      });

    expect(stored.status).toBe("FAILED");
    expect(stored.claimToken).toBeNull();
  });

  it("never claims terminal or uncertain event statuses", async () => {
    const statuses = [
      "PROCESSING",
      "SUBMITTING",
      "SENT",
      "CANCELLED",
      "UNKNOWN",
    ] as const;

    const events = [];

    for (const status of statuses) {
      events.push(
        await createEvent(`excluded-${status}`, { status })
      );
    }

    const claimed = await claimNewsletterWelcomeEvent(prisma);

    expect(claimed).toBeNull();

    const stored = await prisma.newsletterWelcomeEvent.findMany({
      where: {
        id: {
          in: events.map((event) => event.id),
        },
      },
    });

    expect(stored).toHaveLength(statuses.length);

    for (const event of stored) {
      const original = events.find(
        (candidate) => candidate.id === event.id
      );

      expect(original).toBeDefined();
      expect(event.status).toBe(original?.status);
      expect(event.attemptCount).toBe(original?.attemptCount);
      expect(event.claimToken).toBe(original?.claimToken);
    }
  });

  it("does not claim an event at the maximum attempt limit", async () => {
    const event = await createEvent("max-attempts", {
      status: "FAILED",
      attemptCount: NEWSLETTER_WELCOME_MAX_ATTEMPTS,
      nextAttemptAt: new Date(Date.now() - 60_000),
    });

    const claimed = await claimNewsletterWelcomeEvent(prisma);

    expect(claimed?.id).not.toBe(event.id);

    const stored =
      await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
        where: { id: event.id },
      });

    expect(stored.attemptCount).toBe(
      NEWSLETTER_WELCOME_MAX_ATTEMPTS
    );
    expect(stored.status).toBe("FAILED");
  });

  it("returns null when no eligible events remain", async () => {
    const claimed = await claimNewsletterWelcomeEvent(prisma);

    expect(claimed).toBeNull();
  });
});