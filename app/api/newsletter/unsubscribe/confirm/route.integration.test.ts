import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  sendGoodbye: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(
  "@/lib/resend/templates/marketing/newsletterUnsubscribed",
  () => ({
    sendNewsletterUnsubscribedEmail: mocks.sendGoodbye,
  })
);

const prisma = new PrismaClient();

const createdSubscriberIds: string[] = [];

const expectedDatabase = "veilora_marketing_consent_test_20261111";

function validateUrl(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`STOP: ${name} is missing.`);
  }

  const url = new URL(value);

  if (
    url.protocol !== "postgresql:" &&
    url.protocol !== "postgres:"
  ) {
    throw new Error(`STOP: ${name} is not PostgreSQL.`);
  }

  if (
    url.hostname !== "127.0.0.1" ||
    url.port !== "5432" ||
    decodeURIComponent(url.username) !== "postgres" ||
    decodeURIComponent(url.pathname.slice(1)) !== expectedDatabase
  ) {
    throw new Error(`STOP: ${name} is not the isolated test database.`);
  }
}

function request(token: string) {
  return new Request(
    "http://localhost:3000/api/newsletter/unsubscribe/confirm",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }
  );
}

async function createSubscriber(
  status: "pending" | "subscribed" | "unsubscribed" = "subscribed"
) {
  const id = randomUUID();
  const token = randomUUID();

  const email = `fictional-unsubscribe-${id}@example.invalid`;

  await prisma.newsletterSubscriber.create({
    data: {
      id,
      email,
      status,
      unsubscribeToken: token,
      confirmToken: randomUUID(),
    },
  });

  createdSubscriberIds.push(id);

  return { id, email, token };
}

async function createWelcomeEvent(
  subscriberId: string,
  status:
    | "PENDING"
    | "FAILED"
    | "PROCESSING"
    | "SUBMITTING"
    | "UNKNOWN",
  generation: number
) {
  return prisma.newsletterWelcomeEvent.create({
    data: {
      subscriberId,
      subscriptionGeneration: generation,
      eventKey: `newsletter-welcome-test-${randomUUID()}`,
      status,
    },
  });
}

describe("newsletter direct unsubscribe PostgreSQL integration", () => {
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
      throw new Error("STOP: PostgreSQL identity mismatch.");
    }

    ({ POST } = await import("./route"));
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
      await prisma.$disconnect();
    }
  });

  it("persists withdrawal and invalidates the confirmation token", async () => {
    const { id, token, email } = await createSubscriber();

    const response = await POST(request(token));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const subscriber = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(subscriber.status).toBe("unsubscribed");
    expect(subscriber.unsubscribedAt).not.toBeNull();
    expect(subscriber.confirmToken).toBeNull();

    expect(mocks.sendGoodbye).toHaveBeenCalledWith({ to: email });
  });

  it("cancels pending welcome events atomically with withdrawal", async () => {
    const { id, token } = await createSubscriber();

    await createWelcomeEvent(id, "PENDING", 0);

    const response = await POST(request(token));

    expect(response.status).toBe(200);

    const event = await prisma.newsletterWelcomeEvent.findFirstOrThrow({
      where: { subscriberId: id },
    });

    expect(event.status).toBe("CANCELLED");
    expect(event.nextAttemptAt).toBeNull();
  });

  it("cancels failed welcome events", async () => {
    const { id, token } = await createSubscriber();

    await createWelcomeEvent(id, "FAILED", 0);

    const response = await POST(request(token));

    expect(response.status).toBe(200);

    const event = await prisma.newsletterWelcomeEvent.findFirstOrThrow({
      where: { subscriberId: id },
    });

    expect(event.status).toBe("CANCELLED");
  });

  it("preserves uncertain provider-submission outcomes", async () => {
    const { id, token } = await createSubscriber();

    await createWelcomeEvent(id, "UNKNOWN", 0);

    const response = await POST(request(token));

    expect(response.status).toBe(200);

    const event = await prisma.newsletterWelcomeEvent.findFirstOrThrow({
      where: { subscriberId: id },
    });

    expect(event.status).toBe("UNKNOWN");
  });

  it("does not send a second goodbye email on repeated withdrawal", async () => {
    const { token, email } = await createSubscriber();

    mocks.sendGoodbye.mockClear();

    const first = await POST(request(token));
    const second = await POST(request(token));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    expect(mocks.sendGoodbye).toHaveBeenCalledTimes(1);
    expect(mocks.sendGoodbye).toHaveBeenCalledWith({ to: email });
  });

  it("serialises concurrent unsubscribe requests", async () => {
    const { id, token, email } = await createSubscriber();

    mocks.sendGoodbye.mockClear();

    const [first, second] = await Promise.all([
      POST(request(token)),
      POST(request(token)),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const subscriber = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(subscriber.status).toBe("unsubscribed");

    expect(mocks.sendGoodbye).toHaveBeenCalledTimes(1);
    expect(mocks.sendGoodbye).toHaveBeenCalledWith({ to: email });
  });

  it("rejects an invalid unsubscribe token without modifying records", async () => {
    const { id } = await createSubscriber();

    const response = await POST(request(randomUUID()));

    expect(response.status).toBe(404);

    const subscriber = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(subscriber.status).toBe("subscribed");
  });
});