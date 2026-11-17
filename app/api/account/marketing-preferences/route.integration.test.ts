import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  authenticatedShopperId: "",
}));

vi.mock("@/lib/auth/ShopperSession", () => ({
  requireAuthenticatedShopper: vi.fn(async () => ({
    id: mocks.authenticatedShopperId,
  })),
}));

const prisma = new PrismaClient();

const shopperIds: string[] = [];
const newsletterIds: string[] = [];

function emailFor(label: string) {
  return `fictional-42fx-${label}-${randomUUID()}@example.invalid`;
}

function requestWithdrawal() {
  return new Request(
    "http://localhost:3000/api/account/marketing-preferences",
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        marketingConsent: false,
      }),
    }
  ) as NextRequest;
}

async function createShopper(email: string, consent: boolean) {
  const shopper = await prisma.shopper.create({
    data: {
      email,
      password: "fictional-test-password",
      dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
      emailVerifiedAt: new Date(),
      marketingConsent: consent,
      marketingConsentAt: consent ? new Date() : null,
      marketingConsentVersion: 0,
    },
  });

  shopperIds.push(shopper.id);

  return shopper;
}

async function createNewsletter(email: string) {
  const id = randomUUID();

  await prisma.newsletterSubscriber.create({
    data: {
      id,
      email,
      status: "subscribed",
      confirmToken: randomUUID(),
    },
  });

  newsletterIds.push(id);

  return id;
}

describe("shopper withdrawal PostgreSQL integration", () => {
  let PATCH: typeof import("./route").PATCH;

  beforeAll(async () => {
    const expectedDatabase =
      "veilora_marketing_consent_test_20261111";

    if (
      !process.env.DATABASE_URL?.includes(expectedDatabase) ||
      !process.env.DIRECT_URL?.includes(expectedDatabase)
    ) {
      throw new Error(
        "STOP: Isolated consent database URL required."
      );
    }

    const identity = await prisma.$queryRaw<
      Array<{ database_name: string; server_port: number }>
    >`
      SELECT
        current_database()::text AS database_name,
        inet_server_port()::integer AS server_port
    `;

    if (
      identity.length !== 1 ||
      identity[0].database_name !== expectedDatabase ||
      identity[0].server_port !== 5432
    ) {
      throw new Error(
        "STOP: Unexpected PostgreSQL database identity."
      );
    }

    ({ PATCH } = await import("./route"));
  });

  afterAll(async () => {
    if (shopperIds.length) {
      await prisma.shopperMarketingConsentSync.deleteMany({
        where: { shopperId: { in: shopperIds } },
      });

      await prisma.shopperMarketingEvent.deleteMany({
        where: { shopperId: { in: shopperIds } },
      });
    }

    if (newsletterIds.length) {
      await prisma.newsletterSubscriber.deleteMany({
        where: { id: { in: newsletterIds } },
      });
    }

    if (shopperIds.length) {
      await prisma.shopper.deleteMany({
        where: { id: { in: shopperIds } },
      });
    }

    await prisma.$disconnect();
  });

  it("atomically withdraws account and newsletter consent", async () => {
    const email = emailFor("withdraw");

    const shopper = await createShopper(email, true);
    const newsletterId = await createNewsletter(email);

    mocks.authenticatedShopperId = shopper.id;

    const response = await PATCH(requestWithdrawal());

    expect(response.status).toBe(200);

    const updatedShopper = await prisma.shopper.findUniqueOrThrow({
      where: { id: shopper.id },
    });

    const newsletter =
      await prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { id: newsletterId },
      });

    const operation =
      await prisma.shopperMarketingConsentSync.findFirst({
        where: {
          shopperId: shopper.id,
          reason: "ACCOUNT_OPT_OUT",
        },
      });

    expect(updatedShopper.marketingConsent).toBe(false);
    expect(updatedShopper.marketingConsentVersion).toBe(1);

    expect(newsletter.status).toBe("unsubscribed");
    expect(newsletter.confirmToken).toBeNull();

    expect(operation).not.toBeNull();
    expect(operation?.desiredConsent).toBe(false);
    expect(operation?.status).toBe("PENDING");
  });

  it("deactivates newsletter on repeated withdrawal", async () => {
    const email = emailFor("repeat");

    const shopper = await createShopper(email, false);
    const newsletterId = await createNewsletter(email);

    mocks.authenticatedShopperId = shopper.id;

    const response = await PATCH(requestWithdrawal());

    expect(response.status).toBe(200);

    const newsletter =
      await prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { id: newsletterId },
      });

    const updatedShopper =
      await prisma.shopper.findUniqueOrThrow({
        where: { id: shopper.id },
      });

    expect(newsletter.status).toBe("unsubscribed");
    expect(updatedShopper.marketingConsent).toBe(false);
    expect(updatedShopper.marketingConsentVersion).toBe(1);

    const operations =
      await prisma.shopperMarketingConsentSync.findMany({
        where: { shopperId: shopper.id },
      });

    expect(operations).toHaveLength(1);
    expect(operations[0].reason).toBe("ACCOUNT_OPT_OUT");
    expect(operations[0].desiredConsent).toBe(false);
    expect(operations[0].consentVersion).toBe(1);

    const secondResponse = await PATCH(requestWithdrawal());

    expect(secondResponse.status).toBe(200);

    const shopperAfterSecondWithdrawal =
      await prisma.shopper.findUniqueOrThrow({
        where: { id: shopper.id },
      });

    const newsletterAfterSecondWithdrawal =
      await prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { id: newsletterId },
      });

    const operationsAfterSecondWithdrawal =
      await prisma.shopperMarketingConsentSync.findMany({
        where: { shopperId: shopper.id },
      });

    expect(shopperAfterSecondWithdrawal.marketingConsent).toBe(false);
    expect(shopperAfterSecondWithdrawal.marketingConsentVersion).toBe(1);
    expect(newsletterAfterSecondWithdrawal.status).toBe("unsubscribed");
    expect(operationsAfterSecondWithdrawal).toHaveLength(1);
    expect(operationsAfterSecondWithdrawal[0].id).toBe(operations[0].id);
  });

  it("rolls back withdrawal when consent-sync creation fails", async () => {
    const email = emailFor("rollback");

    const shopper = await createShopper(email, true);
    const newsletterId = await createNewsletter(email);

    mocks.authenticatedShopperId = shopper.id;

    const conflictingOperationKey =
      `shopper-marketing-consent:${shopper.id}:1:ACCOUNT_OPT_OUT`;

    await prisma.shopperMarketingConsentSync.create({
      data: {
        shopperId: shopper.id,
        email,
        consentVersion: 1,
        desiredConsent: false,
        reason: "ACCOUNT_OPT_OUT",
        operationKey: conflictingOperationKey,
        status: "PENDING",
      },
    });

    const response = await PATCH(requestWithdrawal());

    expect(response.status).toBe(500);

    const updatedShopper =
      await prisma.shopper.findUniqueOrThrow({
        where: { id: shopper.id },
      });

    const newsletter =
      await prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { id: newsletterId },
      });

    expect(updatedShopper.marketingConsent).toBe(true);
    expect(updatedShopper.marketingConsentVersion).toBe(0);
    expect(newsletter.status).toBe("subscribed");
    expect(newsletter.confirmToken).not.toBeNull();
  });
});
