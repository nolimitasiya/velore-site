import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

vi.mock("server-only", () => ({}));

import {
  transitionShopperMarketingReconciliation,
} from "./transitionShopperMarketingReconciliation";

const EXPECTED_DATABASE =
  "veilora_marketing_consent_test_20261111";

const prisma = new PrismaClient();

const createdShopperIds: string[] = [];

async function assertIsolatedDatabase() {
  const result = await prisma.$queryRaw<
    Array<{ database_name: string }>
  >`SELECT current_database() AS database_name`;

  if (
    result.length !== 1 ||
    result[0].database_name !== EXPECTED_DATABASE
  ) {
    throw new Error("STOP: Unexpected database target.");
  }
}

async function createFixture(
  consentVersion: number,
  operationVersion: number
) {
  await assertIsolatedDatabase();

  const shopperId = randomUUID();
  const operationId = randomUUID();
  const email = `fictional-42eo-${shopperId}@example.invalid`;

  await prisma.shopper.create({
    data: {
      id: shopperId,
      email,
      password: "integration-test-not-a-real-password",
      marketingConsent: true,
      marketingConsentVersion: consentVersion,
    },
  });

  createdShopperIds.push(shopperId);

  await prisma.shopperMarketingConsentSync.create({
    data: {
      id: operationId,
      shopperId,
      email,
      desiredConsent: true,
      reason: "ACCOUNT_OPT_IN",
      status: "SUBMITTED",
      providerJobId: `fictional-job-${operationId}`,
      consentVersion: operationVersion,
      operationKey: `fictional-operation-${operationId}`,
    },
  });

  return {
    shopperId,
    operationId,
    providerJobId: `fictional-job-${operationId}`,
  };
}

afterAll(async () => {
  try {
    await assertIsolatedDatabase();

    for (const shopperId of createdShopperIds) {
      await prisma.shopperMarketingConsentSync.deleteMany({
        where: { shopperId },
      });

      await prisma.shopper.deleteMany({
        where: { id: shopperId },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe("real PostgreSQL marketing reconciliation", () => {
  it("applies a valid current-consent operation", async () => {
    const fixture = await createFixture(3, 3);

    const result =
      await transitionShopperMarketingReconciliation(
        prisma,
        fixture.operationId,
        {
          decision: "APPLIED",
          providerEvidenceVerified: true,
          providerJobId: fixture.providerJobId,
        }
      );

    expect(result).toEqual({ outcome: "UPDATED" });

    const operation =
      await prisma.shopperMarketingConsentSync.findUnique({
        where: { id: fixture.operationId },
      });

    expect(operation?.status).toBe("APPLIED");
  });

  it("rejects an outdated consent version", async () => {
    const fixture = await createFixture(4, 3);

    const result =
      await transitionShopperMarketingReconciliation(
        prisma,
        fixture.operationId,
        {
          decision: "APPLIED",
          providerEvidenceVerified: true,
          providerJobId: fixture.providerJobId,
        }
      );

    expect(result).toEqual({ outcome: "NOT_UPDATED" });

    const operation =
      await prisma.shopperMarketingConsentSync.findUnique({
        where: { id: fixture.operationId },
      });

    expect(operation?.status).toBe("SUBMITTED");
  });
});
