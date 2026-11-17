import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

vi.mock("@/lib/resend/templates/marketing/newsletterWelcome", () => ({
  sendNewsletterWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

const prisma = new PrismaClient();

const createdShopperIds: string[] = [];
const createdNewsletterIds: string[] = [];
const createdOperationIds: string[] = [];

function emailFor(label: string) {
  return `fictional-42fk-${label}-${randomUUID()}@example.invalid`;
}

async function createNewsletter(email: string) {
  const id = randomUUID();
  const token = randomUUID();

  await prisma.newsletterSubscriber.create({
    data: {
      id,
      email,
      status: "pending",
      confirmToken: token,
    },
  });

  createdNewsletterIds.push(id);

  return { id, token };
}

async function createShopper(
  email: string,
  consent: boolean,
  version: number
) {
  const shopper = await prisma.shopper.create({
    data: {
      email,
      password: "fictional-test-password",
      emailVerifiedAt: new Date(),
      marketingConsent: consent,
      marketingConsentVersion: version,
    },
  });

  createdShopperIds.push(shopper.id);

  return shopper;
}

async function createConsentOperation(
  shopperId: string,
  email: string,
  version: number,
  reason: "ACCOUNT_OPT_IN" | "ACCOUNT_OPT_OUT",
  desiredConsent: boolean
) {
  const operation = await prisma.shopperMarketingConsentSync.create({
    data: {
      shopperId,
      email,
      consentVersion: version,
      reason,
      desiredConsent,
      operationKey: `42fk-${randomUUID()}`,
    },
  });

  createdOperationIds.push(operation.id);
}

describe("newsletter confirmation PostgreSQL integration", () => {
  let GET: typeof import("./route").GET;

  beforeAll(async () => {
    if (
      !process.env.DATABASE_URL?.includes(
        "veilora_marketing_consent_test_20261111"
      )
    ) {
      throw new Error(
        "STOP: Integration test requires isolated consent database."
      );
    }

    ({ GET } = await import("./route"));
  });

  afterAll(async () => {
    if (createdOperationIds.length) {
      await prisma.shopperMarketingConsentSync.deleteMany({
        where: { id: { in: createdOperationIds } },
      });
    }

    if (createdNewsletterIds.length) {
      await prisma.newsletterSubscriber.deleteMany({
        where: { id: { in: createdNewsletterIds } },
      });
    }

    if (createdShopperIds.length) {
      await prisma.shopper.deleteMany({
        where: { id: { in: createdShopperIds } },
      });
    }

    await prisma.$disconnect();
  });

  async function confirm(token: string) {
    return GET(
      new Request(
        `http://localhost:3000/api/newsletter/confirm?token=${token}`
      )
    );
  }

  it("confirms an independent newsletter subscriber", async () => {
    const email = emailFor("independent");
    const { id, token } = await createNewsletter(email);

    const response = await confirm(token);

    expect(response.headers.get("location")).toContain(
      "status=success"
    );

    const subscriber = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(subscriber.status).toBe("subscribed");
    expect(subscriber.confirmToken).toBeNull();
  });

  it("allows default false without withdrawal history", async () => {
    const email = emailFor("default");
    await createShopper(email, false, 0);
    const { token } = await createNewsletter(email);

    const response = await confirm(token);

    expect(response.headers.get("location")).toContain(
      "status=success"
    );
  });

  it("blocks explicit account withdrawal", async () => {
    const email = emailFor("withdrawal");
    const shopper = await createShopper(email, false, 2);

    await createConsentOperation(
      shopper.id,
      email,
      2,
      "ACCOUNT_OPT_OUT",
      false
    );

    const { id, token } = await createNewsletter(email);

    const response = await confirm(token);

    expect(response.headers.get("location")).toContain(
      "status=marketing-preferences"
    );

    const subscriber = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(subscriber.status).toBe("pending");
    expect(subscriber.confirmToken).toBe(token);
  });

  it("allows a subsequent explicit account opt-in", async () => {
    const email = emailFor("reoptin");
    const shopper = await createShopper(email, true, 3);

    await createConsentOperation(
      shopper.id,
      email,
      2,
      "ACCOUNT_OPT_OUT",
      false
    );

    await createConsentOperation(
      shopper.id,
      email,
      3,
      "ACCOUNT_OPT_IN",
      true
    );

    const { token } = await createNewsletter(email);

    const response = await confirm(token);

    expect(response.headers.get("location")).toContain(
      "status=success"
    );
  });

  it("does not mistake an email-change consent reset for withdrawal", async () => {
    const email = emailFor("email-reset");

    await createShopper(email, false, 3);

    const { id, token } = await createNewsletter(email);

    const response = await confirm(token);

    expect(response.headers.get("location")).toContain(
      "status=success"
    );

    const subscriber = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(subscriber.status).toBe("subscribed");
    expect(subscriber.confirmToken).toBeNull();
  });
});
