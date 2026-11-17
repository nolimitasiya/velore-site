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
import { prisma as sharedPrisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  authenticatedShopperId: "",
  sendWelcome: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/ShopperSession", () => ({
  requireAuthenticatedShopper: vi.fn(async () => ({
    id: mocks.authenticatedShopperId,
  })),
}));

vi.mock(
  "@/lib/resend/templates/marketing/newsletterWelcome",
  () => ({
    sendNewsletterWelcomeEmail: mocks.sendWelcome,
  })
);

const prisma = new PrismaClient();

const shopperIds: string[] = [];
const newsletterIds: string[] = [];

function emailFor(label: string) {
  return `fictional-42gh-${label}-${randomUUID()}@example.invalid`;
}

async function createShopper(email: string) {
  const shopper = await prisma.shopper.create({
    data: {
      email,
      password: "fictional-test-password",
      dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
      emailVerifiedAt: new Date(),
      marketingConsent: true,
      marketingConsentAt: new Date(),
      marketingConsentVersion: 0,
    },
  });

  shopperIds.push(shopper.id);

  return shopper;
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

  newsletterIds.push(id);

  return { id, token };
}

describe("newsletter/account consent concurrency", () => {
  let confirmRoute: typeof import("./route").GET;
  let withdrawRoute:
    typeof import("../../account/marketing-preferences/route").PATCH;

  beforeAll(async () => {
    const expectedDatabase =
      "veilora_marketing_consent_test_20261111";

    if (
      !process.env.DATABASE_URL?.includes(expectedDatabase) ||
      !process.env.DIRECT_URL?.includes(expectedDatabase)
    ) {
      throw new Error(
        "STOP: Isolated consent database URLs required."
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

    ({ GET: confirmRoute } = await import("./route"));

    ({ PATCH: withdrawRoute } = await import(
      "../../account/marketing-preferences/route"
    ));
  });

  afterAll(async () => {
    try {
      if (shopperIds.length) {
        await prisma.shopperMarketingConsentSync.deleteMany({
          where: {
            shopperId: { in: shopperIds },
          },
        });

        await prisma.shopperMarketingEvent.deleteMany({
          where: {
            shopperId: { in: shopperIds },
          },
        });
      }

      if (newsletterIds.length) {
        await prisma.newsletterSubscriber.deleteMany({
          where: {
            id: { in: newsletterIds },
          },
        });
      }

      if (shopperIds.length) {
        await prisma.shopper.deleteMany({
          where: {
            id: { in: shopperIds },
          },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  function confirm(token: string) {
    return confirmRoute(
      new Request(
        `http://localhost:3000/api/newsletter/confirm?token=${token}`
      )
    );
  }

  function withdraw() {
    return withdrawRoute(
      new Request(
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
      ) as NextRequest
    );
  }

  async function inspect(shopperId: string, newsletterId: string) {
    const [shopper, newsletter, operations] =
      await Promise.all([
        prisma.shopper.findUniqueOrThrow({
          where: { id: shopperId },
        }),
        prisma.newsletterSubscriber.findUniqueOrThrow({
          where: { id: newsletterId },
        }),
        prisma.shopperMarketingConsentSync.findMany({
          where: { shopperId },
        }),
      ]);

    return { shopper, newsletter, operations };
  }

  it("blocks confirmation after committed withdrawal", async () => {
    mocks.sendWelcome.mockClear();

    const email = emailFor("withdraw-first");
    const shopper = await createShopper(email);
    const newsletter = await createNewsletter(email);

    mocks.authenticatedShopperId = shopper.id;

    const withdrawal = await withdraw();

    expect(withdrawal.status).toBe(200);

    const confirmation = await confirm(newsletter.token);

    expect(
      confirmation.headers.get("location")
    ).not.toContain("status=success");

    const state = await inspect(shopper.id, newsletter.id);

    expect(state.shopper.marketingConsent).toBe(false);
    expect(state.newsletter.status).toBe("unsubscribed");
    expect(state.operations.filter(
      (operation) => operation.reason === "ACCOUNT_OPT_OUT"
    )).toHaveLength(1);

    expect(mocks.sendWelcome).not.toHaveBeenCalled();
  });

  it("withdraws successfully after committed confirmation", async () => {
    mocks.sendWelcome.mockClear();

    const email = emailFor("confirm-first");
    const shopper = await createShopper(email);
    const newsletter = await createNewsletter(email);

    mocks.authenticatedShopperId = shopper.id;

    const confirmation = await confirm(newsletter.token);

    expect(
      confirmation.headers.get("location")
    ).toContain("status=success");

    const withdrawal = await withdraw();

    expect(withdrawal.status).toBe(200);

    const state = await inspect(shopper.id, newsletter.id);

    expect(state.shopper.marketingConsent).toBe(false);
    expect(state.newsletter.status).toBe("unsubscribed");
    expect(state.newsletter.confirmToken).toBeNull();
    expect(state.operations.filter(
      (operation) => operation.reason === "ACCOUNT_OPT_OUT"
    )).toHaveLength(1);
  });

  it("creates a durable welcome event without directly sending before withdrawal", async () => {
    mocks.sendWelcome.mockReset();

    const email = emailFor("welcome-outbox");
    const shopper = await createShopper(email);
    const newsletter = await createNewsletter(email);

    mocks.authenticatedShopperId = shopper.id;

    const confirmation = await confirm(newsletter.token);

    expect(
      confirmation.headers.get("location")
    ).toContain("status=success");

    const event = await prisma.newsletterWelcomeEvent.findFirst({
      where: { subscriberId: newsletter.id },
    });

    expect(event).not.toBeNull();
    expect(event?.status).toBe("PENDING");
    expect(mocks.sendWelcome).not.toHaveBeenCalled();

    const withdrawal = await withdraw();

    expect(withdrawal.status).toBe(200);

    const state = await inspect(shopper.id, newsletter.id);

    expect(state.shopper.marketingConsent).toBe(false);
    expect(state.newsletter.status).toBe("unsubscribed");
    expect(mocks.sendWelcome).not.toHaveBeenCalled();
  });

  it("does not dispatch directly after withdrawal following a committed confirmation", async () => {
    mocks.sendWelcome.mockReset();

    const email = emailFor("post-commit-outbox");
    const shopper = await createShopper(email);
    const newsletter = await createNewsletter(email);

    mocks.authenticatedShopperId = shopper.id;

    let releaseTransaction!: () => void;
    let signalTransactionCommitted!: () => void;

    const transactionCommitted = new Promise<void>((resolve) => {
      signalTransactionCommitted = resolve;
    });

    const transactionGate = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });

    const originalTransaction = sharedPrisma.$transaction.bind(sharedPrisma);

    let interceptNextTransaction = true;

    const transactionSpy = vi
      .spyOn(sharedPrisma, "$transaction")
      .mockImplementation((async (...args: Parameters<typeof sharedPrisma.$transaction>) => {
        const result = await originalTransaction(...args);

        if (interceptNextTransaction) {
          interceptNextTransaction = false;
          signalTransactionCommitted();
          await transactionGate;
        }

        return result;
      }) as typeof sharedPrisma.$transaction);

    let confirmationPromise: ReturnType<typeof confirm> | null = null;

    try {
      confirmationPromise = confirm(newsletter.token);

      await transactionCommitted;

      const committedNewsletter =
        await prisma.newsletterSubscriber.findUniqueOrThrow({
          where: { id: newsletter.id },
        });

      expect(committedNewsletter.status).toBe("subscribed");
      expect(mocks.sendWelcome).not.toHaveBeenCalled();

      const withdrawal = await withdraw();

      expect(withdrawal.status).toBe(200);

      const withdrawnState = await inspect(
        shopper.id,
        newsletter.id
      );

      expect(withdrawnState.shopper.marketingConsent).toBe(false);
      expect(withdrawnState.newsletter.status).toBe("unsubscribed");

      releaseTransaction();

      const confirmation = await confirmationPromise;

      expect(
        confirmation.headers.get("location")
      ).toContain("status=success");

      expect(mocks.sendWelcome).not.toHaveBeenCalled();
    } finally {
      releaseTransaction();
      transactionSpy.mockRestore();

      if (confirmationPromise) {
        await confirmationPromise.catch(() => undefined);
      }

      mocks.sendWelcome.mockReset();
      mocks.sendWelcome.mockResolvedValue(undefined);
    }
  });
  it("does not report a failed simultaneous withdrawal as success", async () => {
    mocks.sendWelcome.mockClear();

    const email = emailFor("simultaneous");
    const shopper = await createShopper(email);
    const newsletter = await createNewsletter(email);

    mocks.authenticatedShopperId = shopper.id;

    const [confirmation, withdrawal] = await Promise.all([
      confirm(newsletter.token),
      withdraw(),
    ]);

    const state = await inspect(shopper.id, newsletter.id);

    expect([200, 409, 500, 503]).toContain(withdrawal.status);

    if (withdrawal.status === 200) {
      expect(state.shopper.marketingConsent).toBe(false);
      expect(state.newsletter.status).toBe("unsubscribed");
      expect(state.operations.some(
        (operation) =>
          operation.reason === "ACCOUNT_OPT_OUT"
      )).toBe(true);
    }

    if (withdrawal.status !== 200) {
      expect(withdrawal.status).not.toBe(200);
    }

    expect([302, 303, 307, 308, 503]).toContain(
      confirmation.status
    );
  });
});
