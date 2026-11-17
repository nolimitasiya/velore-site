import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { requireLocalFeedbackTestDb } from "./requireLocalFeedbackTestDb";

describe("Live Feedback database safety guard", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("verifies the dedicated local PostgreSQL database", async () => {
    await expect(
      requireLocalFeedbackTestDb(prisma)
    ).resolves.toBeUndefined();
  });

  it("confirms all 99 migrations completed successfully", async () => {
    await requireLocalFeedbackTestDb(prisma);

    const [result] = await prisma.$queryRaw<
      Array<{
        successful: bigint;
        incomplete: bigint;
      }>
    >`
      SELECT
        COUNT(*) FILTER (
          WHERE finished_at IS NOT NULL
          AND rolled_back_at IS NULL
        ) AS successful,
        COUNT(*) FILTER (
          WHERE finished_at IS NULL
          AND rolled_back_at IS NULL
        ) AS incomplete
      FROM "_prisma_migrations"
    `;

    expect(Number(result.successful)).toBe(99);
    expect(Number(result.incomplete)).toBe(0);
  });

  it("confirms Feedback and RateLimit remain empty", async () => {
    await requireLocalFeedbackTestDb(prisma);

    const [result] = await prisma.$queryRaw<
      Array<{
        feedback_count: bigint;
        rate_limit_count: bigint;
      }>
    >`
      SELECT
        (SELECT COUNT(*) FROM "FeedbackSubmission")
          AS feedback_count,
        (SELECT COUNT(*) FROM "RateLimit")
          AS rate_limit_count
    `;

    expect(Number(result.feedback_count)).toBe(0);
    expect(Number(result.rate_limit_count)).toBe(0);
  });
});