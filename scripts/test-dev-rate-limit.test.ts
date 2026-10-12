import { assertDevelopmentDatabase } from "./assertDevelopmentDatabase";
import { vi, test } from "vitest";
vi.mock("server-only", () => ({}));

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

async function main() {
  assertDevelopmentDatabase();

  const prefix = `integration:rate-limit:${randomUUID()}`;
  const sequentialKey = `${prefix}:sequential`;
  const concurrentKey = `${prefix}:concurrent`;
  const expiryKey = `${prefix}:expiry`;

  try {
    console.log("TEST 1: Sequential rate limiting");

    const sequential = [];

    for (let i = 0; i < 4; i++) {
      sequential.push(
        await rateLimit({
          key: sequentialKey,
          limit: 3,
          windowMs: 60_000,
        }),
      );
    }

    if (
      sequential[0].ok !== true ||
      sequential[1].ok !== true ||
      sequential[2].ok !== true ||
      sequential[3].ok !== false
    ) {
      throw new Error("Sequential rate limiting failed.");
    }

    console.log("PASS: Sequential limit enforced.");

    console.log("TEST 2: Concurrent rate limiting");

    const concurrent = await Promise.all(
      Array.from({ length: 5 }, () =>
        rateLimit({
          key: concurrentKey,
          limit: 3,
          windowMs: 60_000,
        }),
      ),
    );

    const allowed = concurrent.filter((result) => result.ok).length;

    if (allowed !== 3) {
      throw new Error(
        `Concurrency test failed: ${allowed} requests were allowed.`,
      );
    }

    console.log("PASS: Exactly three concurrent requests allowed.");

    console.log("TEST 3: Expired-window reset");

    await prisma.rateLimit.create({
      data: {
        key: expiryKey,
        count: 10,
        resetAt: new Date(Date.now() - 60_000),
      },
    });

    const reset = await rateLimit({
      key: expiryKey,
      limit: 3,
      windowMs: 60_000,
    });

    if (!reset.ok || reset.remaining !== 2) {
      throw new Error("Expired-window reset failed.");
    }

    console.log("PASS: Expired window reset.");

    console.log("ALL RATE-LIMIT INTEGRATION TESTS PASSED.");
  } finally {
    await prisma.rateLimit.deleteMany({
      where: {
        key: {
          startsWith: prefix,
        },
      },
    });

    await prisma.$disconnect();
  }
}

test.skipIf(process.env.VEILORA_DEV_INTEGRATION_TEST !== "true")("development PostgreSQL rate limiting", async () => {
  await main();
}, 60000);
