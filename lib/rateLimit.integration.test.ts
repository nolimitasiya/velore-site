import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("server-only", () => ({}));

import { prisma } from "@/lib/prisma";
import { requireLocalSecurityTestDb } from "@/lib/testing/requireLocalSecurityTestDb";
import { rateLimit } from "./rateLimit";

const runId = randomUUID();

const firstKey = `security-test:concurrency:${runId}`;
const secondKey = `security-test:independent:${runId}`;

const testKeys = [firstKey, secondKey];

let databaseVerified = false;

describe("Real PostgreSQL rate-limit concurrency", () => {
  beforeAll(async () => {
    await requireLocalSecurityTestDb(prisma);
    databaseVerified = true;
  });

  afterAll(async () => {
    if (!databaseVerified) return;

    // Verify the database identity again before cleanup.
    await requireLocalSecurityTestDb(prisma);

    await prisma.rateLimit.deleteMany({
      where: {
        key: { in: testKeys },
      },
    });

    const remaining = await prisma.rateLimit.count({
      where: {
        key: { in: testKeys },
      },
    });

    expect(remaining).toBe(0);

    console.log("PASS: Synthetic rate-limit records removed.");
  });

  it("allows exactly five of twenty concurrent requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        rateLimit({
          key: firstKey,
          limit: 5,
          windowMs: 60_000,
        }),
      ),
    );

    const allowed = results.filter((result) => result.ok);
    const blocked = results.filter((result) => !result.ok);

    expect(allowed).toHaveLength(5);
    expect(blocked).toHaveLength(15);

    const stored = await prisma.rateLimit.findUnique({
      where: { key: firstKey },
    });

    expect(stored?.count).toBe(5);

    console.log(
      "PASS: Exactly 5 requests allowed and 15 blocked.",
    );
  });

  it("does not increment the counter after the limit is reached", async () => {
    const result = await rateLimit({
      key: firstKey,
      limit: 5,
      windowMs: 60_000,
    });

    expect(result.ok).toBe(false);

    const stored = await prisma.rateLimit.findUnique({
      where: { key: firstKey },
    });

    expect(stored?.count).toBe(5);
  });

  it("maintains independent counters for separate keys", async () => {
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        rateLimit({
          key: secondKey,
          limit: 3,
          windowMs: 60_000,
        }),
      ),
    );

    expect(results.every((result) => result.ok)).toBe(true);

    const stored = await prisma.rateLimit.findUnique({
      where: { key: secondKey },
    });

    expect(stored?.count).toBe(3);

    const firstStored = await prisma.rateLimit.findUnique({
      where: { key: firstKey },
    });

    expect(firstStored?.count).toBe(5);
  });
});