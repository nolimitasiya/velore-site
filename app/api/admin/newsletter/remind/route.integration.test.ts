import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma as sharedPrisma } from "@/lib/prisma";
import { lockNewsletterEmail } from "@/lib/marketing/lockNewsletterEmail";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn().mockResolvedValue({ id: "admin-test" }),
  sendReminder: vi.fn().mockResolvedValue({ id: "mock-email" }),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: mocks.requireAdminSession,
}));

vi.mock("@/lib/resend/templates/marketing/newsletterConfirm", () => ({
  sendNewsletterConfirmEmail: mocks.sendReminder,
}));

const prisma = new PrismaClient();

const expectedDatabase = "veilora_marketing_consent_test_20261111";
const createdSubscriberIds: string[] = [];

function validateUrl(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`STOP: ${name} is missing.`);
  }

  const url = new URL(value);

  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "5432" ||
    decodeURIComponent(url.username) !== "postgres" ||
    decodeURIComponent(url.pathname.slice(1)) !== expectedDatabase
  ) {
    throw new Error(`STOP: ${name} is not the isolated database.`);
  }
}

function request(id: string) {
  return new Request("https://www.veiloraclub.com/api/admin/newsletter/remind", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

async function createSubscriber() {
  const id = randomUUID();
  const email = `fictional-admin-reminder-${id}@example.invalid`;
  const confirmToken = randomUUID();
  const unsubscribeToken = randomUUID();

  await prisma.newsletterSubscriber.create({
    data: {
      id,
      email,
      status: "pending",
      confirmToken,
      unsubscribeToken,
    },
  });

  createdSubscriberIds.push(id);

  return { id, email, confirmToken, unsubscribeToken };
}

describe("admin newsletter reminder PostgreSQL integration", () => {
  let POST: typeof import("./route").POST;

  beforeAll(async () => {
    validateUrl(process.env.DATABASE_URL, "DATABASE_URL");
    validateUrl(process.env.DIRECT_URL, "DIRECT_URL");

    const identity = await prisma.$queryRaw<
      Array<{
        database_name: string;
        server_host: string;
        server_port: number;
        database_user: string;
      }>
    >`
      SELECT
        current_database()::text AS database_name,
        host(inet_server_addr())::text AS server_host,
        inet_server_port()::integer AS server_port,
        current_user::text AS database_user
    `;

    if (
      identity.length !== 1 ||
      identity[0].database_name !== expectedDatabase ||
      identity[0].server_host !== "127.0.0.1" ||
      identity[0].server_port !== 5432 ||
      identity[0].database_user !== "postgres"
    ) {
      throw new Error("STOP: Unexpected PostgreSQL identity.");
    }

    ({ POST } = await import("./route"));
  });

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.veiloraclub.com");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    mocks.requireAdminSession.mockClear();
    mocks.sendReminder.mockReset();
    mocks.sendReminder.mockResolvedValue({ id: "mock-email" });
  });

  afterAll(async () => {
    try {
      if (createdSubscriberIds.length) {
        await prisma.newsletterWelcomeEvent.deleteMany({
          where: {
            subscriberId: { in: createdSubscriberIds },
          },
        });

        await prisma.newsletterSubscriber.deleteMany({
          where: {
            id: { in: createdSubscriberIds },
          },
        });
      }
    } finally {
      vi.unstubAllEnvs();
      await prisma.$disconnect();
    }
  });

  it("preserves the existing confirmation token when sending one reminder", async () => {
    const subscriber = await createSubscriber();

    const response = await POST(request(subscriber.id));

    expect(response.status).toBe(200);

    const stored = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });

    expect(stored.confirmToken).toBe(subscriber.confirmToken);
    expect(stored.confirmToken).toBe(subscriber.confirmToken);

    expect(mocks.sendReminder).toHaveBeenCalledOnce();
    expect(mocks.sendReminder).toHaveBeenCalledWith({
      to: subscriber.email,
      confirmToken: stored.confirmToken,
      unsubscribeToken: subscriber.unsubscribeToken,
    });
  });

  it("generates and persists a confirmation token when one is missing", async () => {
    const subscriber = await createSubscriber();

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { confirmToken: null },
    });

    const response = await POST(request(subscriber.id));

    expect(response.status).toBe(200);

    const stored = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });

    expect(stored.confirmToken).toMatch(/^[0-9a-f]{48}$/);

    expect(mocks.sendReminder).toHaveBeenCalledOnce();
    expect(mocks.sendReminder).toHaveBeenCalledWith({
      to: subscriber.email,
      confirmToken: stored.confirmToken,
      unsubscribeToken: subscriber.unsubscribeToken,
    });
  });
  it("handles two concurrent reminder requests without corrupting subscriber state", async () => {
    const subscriber = await createSubscriber();

    const responses = await Promise.all([
      POST(request(subscriber.id)),
      POST(request(subscriber.id)),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);

    const stored = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });

    expect(stored.status).toBe("pending");
    expect(stored.confirmToken).toBe(subscriber.confirmToken);

    expect(mocks.sendReminder).toHaveBeenCalledTimes(2);

    const tokens = mocks.sendReminder.mock.calls.map(
      (call) => call[0].confirmToken
    );

    expect(new Set(tokens).size).toBe(1);
    expect(tokens).toEqual([subscriber.confirmToken, subscriber.confirmToken]);
  });

  it("rejects a reminder after a committed unsubscribe", async () => {
    const subscriber = await createSubscriber();

    await prisma.$transaction(async (tx) => {
      await lockNewsletterEmail(tx, subscriber.email);

      await tx.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: {
          status: "unsubscribed",
          unsubscribedAt: new Date(),
          confirmToken: null,
        },
      });
    });

    const response = await POST(request(subscriber.id));

    expect(response.status).toBe(400);
    expect(mocks.sendReminder).not.toHaveBeenCalled();

    const stored = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });

    expect(stored.status).toBe("unsubscribed");
    expect(stored.confirmToken).toBeNull();
  });

  it("does not dispatch a reminder when its transaction fails", async () => {
    const subscriber = await createSubscriber();

    const originalTransaction =
      sharedPrisma.$transaction.bind(sharedPrisma);

    const transactionSpy = vi
      .spyOn(sharedPrisma, "$transaction")
      .mockImplementation((async () => {
        throw new Error("Mock transaction failure");
      }) as typeof sharedPrisma.$transaction);

    try {
      const response = await POST(request(subscriber.id));

      expect(response.status).toBe(500);
      expect(mocks.sendReminder).not.toHaveBeenCalled();

      const stored = await prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { id: subscriber.id },
      });

      expect(stored.confirmToken).toBe(subscriber.confirmToken);
    } finally {
      transactionSpy.mockRestore();
      void originalTransaction;
    }
  });

  it("documents reminder dispatch after an overlapping unsubscribe commits", async () => {
    const subscriber = await createSubscriber();

    let signalCommitted!: () => void;
    let releaseReminder!: () => void;

    const committed = new Promise<void>((resolve) => {
      signalCommitted = resolve;
    });

    const reminderGate = new Promise<void>((resolve) => {
      releaseReminder = resolve;
    });

    const originalTransaction = sharedPrisma.$transaction.bind(sharedPrisma);

    let interceptNextTransaction = true;

    const transactionSpy = vi
      .spyOn(sharedPrisma, "$transaction")
      .mockImplementation((async (...args: Parameters<typeof sharedPrisma.$transaction>) => {
        const result = await originalTransaction(...args);

        if (interceptNextTransaction) {
          interceptNextTransaction = false;
          signalCommitted();
          await reminderGate;
        }

        return result;
      }) as typeof sharedPrisma.$transaction);

    let reminderPromise: ReturnType<typeof POST> | null = null;

    try {
      reminderPromise = POST(request(subscriber.id));

      await committed;

      const afterReminderCommit =
        await prisma.newsletterSubscriber.findUniqueOrThrow({
          where: { id: subscriber.id },
        });

      expect(afterReminderCommit.status).toBe("pending");
      expect(afterReminderCommit.confirmToken).toBe(subscriber.confirmToken);

      await prisma.$transaction(async (tx) => {
        await lockNewsletterEmail(tx, subscriber.email);

        await tx.newsletterSubscriber.update({
          where: { id: subscriber.id },
          data: {
            status: "unsubscribed",
            unsubscribedAt: new Date(),
            confirmToken: null,
          },
        });
      });

      const afterWithdrawal =
        await prisma.newsletterSubscriber.findUniqueOrThrow({
          where: { id: subscriber.id },
        });

      expect(afterWithdrawal.status).toBe("unsubscribed");
      expect(afterWithdrawal.confirmToken).toBeNull();
      expect(mocks.sendReminder).not.toHaveBeenCalled();

      releaseReminder();

      const response = await reminderPromise;

      expect(response.status).toBe(200);
      expect(mocks.sendReminder).toHaveBeenCalledOnce();

      expect(mocks.sendReminder).toHaveBeenCalledWith({
        to: subscriber.email,
        confirmToken: afterReminderCommit.confirmToken,
        unsubscribeToken: subscriber.unsubscribeToken,
      });
    } finally {
      releaseReminder();
      transactionSpy.mockRestore();

      if (reminderPromise) {
        await reminderPromise.catch(() => undefined);
      }
    }
  });

  it("preserves earlier confirmation links across repeated reminders", async () => {
    const subscriber = await createSubscriber();

    const firstResponse = await POST(request(subscriber.id));

    expect(firstResponse.status).toBe(200);

    const firstToken =
      mocks.sendReminder.mock.calls[0][0].confirmToken as string;

    const secondResponse = await POST(request(subscriber.id));

    expect(secondResponse.status).toBe(200);
    expect(mocks.sendReminder).toHaveBeenCalledTimes(2);

    const secondToken =
      mocks.sendReminder.mock.calls[1][0].confirmToken as string;

    expect(firstToken).toBe(secondToken);

    const stored = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });

    expect(stored.status).toBe("pending");
    expect(stored.confirmToken).toBe(secondToken);

    const firstTokenMatches = await prisma.newsletterSubscriber.count({
      where: {
        id: subscriber.id,
        confirmToken: firstToken,
      },
    });

    const secondTokenMatches = await prisma.newsletterSubscriber.count({
      where: {
        id: subscriber.id,
        confirmToken: secondToken,
      },
    });

    expect(firstTokenMatches).toBe(1);
    expect(secondTokenMatches).toBe(1);
  });
});