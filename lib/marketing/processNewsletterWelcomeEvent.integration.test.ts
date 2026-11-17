import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaClient } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  sendNewsletterWelcomeEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/resend/templates/marketing/newsletterWelcome", () => ({
  sendNewsletterWelcomeEmail: mocks.sendNewsletterWelcomeEmail,
}));

import { processOneNewsletterWelcomeEvent } from "./processNewsletterWelcomeEvent";
import { recoverNewsletterWelcomeEvents } from "./recoverNewsletterWelcomeEvents";

const EXPECTED_DATABASE = "veilora_marketing_consent_test_20261111";

let prisma: PrismaClient;
let secondPrisma: PrismaClient;
let identityVerified = false;

const createdSubscriberIds: string[] = [];
const currentSubscriberIds: string[] = [];

function verifyUrl(value: string | undefined) {
  if (!value) {
    throw new Error("STOP: DATABASE_URL missing.");
  }

  const url = new URL(value);

  const checks = {
    protocol: ["postgresql:", "postgres:"].includes(url.protocol),
    hostname: url.hostname === "127.0.0.1",
    port: url.port === "5432",
    username: decodeURIComponent(url.username) === "postgres",
    database:
      decodeURIComponent(url.pathname.slice(1)) === EXPECTED_DATABASE,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failedChecks.length > 0) {
    throw new Error(
      `STOP: Incorrect isolated test database URL. Failed checks: ${failedChecks.join(", ")}`
    );
  }
}

async function verifyIdentity(db: PrismaClient) {
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
    status?: "PENDING" | "PROCESSING" | "SUBMITTING";
    subscriberStatus?: string;
    subscriberGeneration?: number;
    eventGeneration?: number;
    claimedAt?: Date;
  } = {}
) {
  const id = randomUUID();

  const subscriber = await prisma.newsletterSubscriber.create({
    data: {
      id,
      email: `worker-${label}-${id}@example.invalid`,
      status: options.subscriberStatus ?? "subscribed",
      subscriptionGeneration: options.subscriberGeneration ?? 0,
      unsubscribeToken: randomUUID(),
    },
  });

  createdSubscriberIds.push(id);
  currentSubscriberIds.push(id);

  const event = await prisma.newsletterWelcomeEvent.create({
    data: {
      subscriberId: id,
      subscriptionGeneration: options.eventGeneration ?? 0,
      eventKey: `newsletter-welcome:${id}:0`,
      status: options.status ?? "PENDING",
      claimToken:
        options.status === "PROCESSING" ||
        options.status === "SUBMITTING"
          ? randomUUID()
          : null,
      claimedAt: options.claimedAt ?? null,
    },
  });

  return { subscriber, event };
}

describe("newsletter welcome worker integration", () => {
  beforeAll(async () => {
    verifyUrl(process.env.DATABASE_URL);

    prisma = new PrismaClient();
    secondPrisma = new PrismaClient();

    await verifyIdentity(prisma);
    await verifyIdentity(secondPrisma);

    const count = await prisma.newsletterWelcomeEvent.count();

    if (count !== 0) {
      throw new Error(
        `STOP: Expected empty isolated welcome queue; found ${count} events.`
      );
    }

    identityVerified = true;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.sendNewsletterWelcomeEmail.mockResolvedValue({
      id: "fictional-provider-message-id",
    });
  });

  afterEach(async () => {
    if (!identityVerified || currentSubscriberIds.length === 0) {
      return;
    }

    const ids = [...currentSubscriberIds];

    await prisma.newsletterWelcomeEvent.deleteMany({
      where: { subscriberId: { in: ids } },
    });

    await prisma.newsletterSubscriber.deleteMany({
      where: { id: { in: ids } },
    });

    currentSubscriberIds.length = 0;
  });

  afterAll(async () => {
    try {
      if (identityVerified && createdSubscriberIds.length > 0) {
        await prisma.newsletterWelcomeEvent.deleteMany({
          where: { subscriberId: { in: createdSubscriberIds } },
        });

        await prisma.newsletterSubscriber.deleteMany({
          where: { id: { in: createdSubscriberIds } },
        });
      }
    } finally {
      if (secondPrisma) await secondPrisma.$disconnect();
      if (prisma) await prisma.$disconnect();
    }
  });

  it("does not access the database when submission is disabled", async () => {
    const inaccessibleDb = new Proxy(
      {},
      {
        get() {
          throw new Error("Database must not be accessed.");
        },
      }
    ) as PrismaClient;

    const result = await processOneNewsletterWelcomeEvent(inaccessibleDb);

    expect(result.status).toBe("READY_NOT_SUBMITTED");
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("sends one email and records SENT", async () => {
    const { event } = await createEvent("success");

    const result = await processOneNewsletterWelcomeEvent(prisma, {
      enableProviderSubmission: true,
    });

    expect(result.status).toBe("SENT");
    expect(mocks.sendNewsletterWelcomeEmail).toHaveBeenCalledTimes(1);

    const stored = await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
      where: { id: event.id },
    });

    expect(stored.status).toBe("SENT");
    expect(stored.providerMessageId).toBe("fictional-provider-message-id");
    expect(stored.claimToken).toBeNull();
  });

  it("cancels an unsubscribed subscriber without sending", async () => {
    const { event } = await createEvent("unsubscribed", {
      subscriberStatus: "unsubscribed",
    });

    const result = await processOneNewsletterWelcomeEvent(prisma, {
      enableProviderSubmission: true,
    });

    expect(result.status).toBe("CANCELLED");
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();

    const stored = await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
      where: { id: event.id },
    });

    expect(stored.status).toBe("CANCELLED");
  });

  it("cancels an event from an older subscription generation", async () => {
    const { event } = await createEvent("generation", {
      subscriberGeneration: 1,
      eventGeneration: 0,
    });

    const result = await processOneNewsletterWelcomeEvent(prisma, {
      enableProviderSubmission: true,
    });

    expect(result.status).toBe("CANCELLED");
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();

    const stored = await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
      where: { id: event.id },
    });

    expect(stored.status).toBe("CANCELLED");
  });

  it("records UNKNOWN when provider acceptance is uncertain", async () => {
    const { event } = await createEvent("uncertain");

    mocks.sendNewsletterWelcomeEmail.mockRejectedValueOnce(
      new Error("Simulated provider timeout")
    );

    const result = await processOneNewsletterWelcomeEvent(prisma, {
      enableProviderSubmission: true,
    });

    expect(result.status).toBe("UNKNOWN");
    expect(mocks.sendNewsletterWelcomeEmail).toHaveBeenCalledTimes(1);

    const stored = await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
      where: { id: event.id },
    });

    expect(stored.status).toBe("UNKNOWN");

    const second = await processOneNewsletterWelcomeEvent(prisma, {
      enableProviderSubmission: true,
    });

    expect(second.status).toBe("EMPTY");
    expect(mocks.sendNewsletterWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  it("prevents concurrent workers from submitting the same event", async () => {
    const { event } = await createEvent("concurrent");

    const results = await Promise.all([
      processOneNewsletterWelcomeEvent(prisma, {
        enableProviderSubmission: true,
      }),
      processOneNewsletterWelcomeEvent(secondPrisma, {
        enableProviderSubmission: true,
      }),
    ]);

    expect(results.filter((result) => result.status === "SENT")).toHaveLength(1);
    expect(mocks.sendNewsletterWelcomeEmail).toHaveBeenCalledTimes(1);

    const stored = await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
      where: { id: event.id },
    });

    expect(stored.status).toBe("SENT");
  });

  it("does not resend after provider acceptance when database completion fails", async () => {
    const { event } = await createEvent("completion-failure");

    const completionModule = await import("./completeNewsletterWelcomeEvent");

    const completionSpy = vi
      .spyOn(completionModule, "completeNewsletterWelcomeEvent")
      .mockRejectedValueOnce(new Error("Simulated database completion failure"));

    try {
      await expect(
        processOneNewsletterWelcomeEvent(prisma, {
          enableProviderSubmission: true,
        })
      ).rejects.toThrow("Simulated database completion failure");
    } finally {
      completionSpy.mockRestore();
    }

    expect(mocks.sendNewsletterWelcomeEmail).toHaveBeenCalledTimes(1);

    const stored = await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
      where: { id: event.id },
    });

    expect(stored.status).toBe("SUBMITTING");

    const second = await processOneNewsletterWelcomeEvent(prisma, {
      enableProviderSubmission: true,
    });

    expect(second.status).toBe("EMPTY");
    expect(mocks.sendNewsletterWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  it("blocks an unsubscribe that occurs before final submission validation", async () => {
    const { subscriber, event } = await createEvent("consent-race");

    const validationModule = await import("./validateClaimedNewsletterWelcomeEvent");

    const originalValidation =
      validationModule.validateClaimedNewsletterWelcomeEvent;

    const validationSpy = vi
      .spyOn(validationModule, "validateClaimedNewsletterWelcomeEvent")
      .mockImplementationOnce(async (...args) => {
        const result = await originalValidation(...args);

        await secondPrisma.newsletterSubscriber.update({
          where: { id: subscriber.id },
          data: {
            status: "unsubscribed",
            unsubscribedAt: new Date(),
          },
        });

        return result;
      });

    try {
      const result = await processOneNewsletterWelcomeEvent(prisma, {
        enableProviderSubmission: true,
      });

      expect(result.status).toBe("CANCELLED");
    } finally {
      validationSpy.mockRestore();
    }

    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();

    const stored = await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
      where: { id: event.id },
    });

    expect(stored.status).toBe("CANCELLED");
  });
  it("marks stale SUBMITTING as UNKNOWN without resending", async () => {
    const { event } = await createEvent("stale", {
      status: "SUBMITTING",
      claimedAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    const recovered = await recoverNewsletterWelcomeEvents(prisma, {
      staleBefore: new Date(Date.now() - 30 * 60 * 1000),
    });

    expect(recovered.submittingMarkedUnknown).toBe(1);

    const stored = await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
      where: { id: event.id },
    });

    expect(stored.status).toBe("UNKNOWN");
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("does not recover an active SUBMITTING event", async () => {
    const { event } = await createEvent("active", {
      status: "SUBMITTING",
      claimedAt: new Date(),
    });

    const recovered = await recoverNewsletterWelcomeEvents(prisma, {
      staleBefore: new Date(Date.now() - 30 * 60 * 1000),
    });

    expect(recovered.submittingMarkedUnknown).toBe(0);

    const stored = await prisma.newsletterWelcomeEvent.findUniqueOrThrow({
      where: { id: event.id },
    });

    expect(stored.status).toBe("SUBMITTING");
  });
});