import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import { prisma } from "@/lib/prisma";
import { requireLocalFeedbackTestDb } from "@/lib/testing/requireLocalFeedbackTestDb";
import { createFeedbackSubmission } from "./createFeedbackSubmission";

const runId = randomUUID();

const persistenceGuestIpHash = `feedback-persistence-${runId}`;
const persistenceMessage = `Synthetic Feedback persistence ${runId}`;

const duplicateGuestIpHash = `feedback-duplicate-${runId}`;
const duplicateMessage = `Synthetic Feedback duplicate ${runId}`;

const testCases = [
  {
    guestIpHash: persistenceGuestIpHash,
    message: persistenceMessage,
  },
  {
    guestIpHash: duplicateGuestIpHash,
    message: duplicateMessage,
  },
];

const testMessages = testCases.map((testCase) => testCase.message);

const testRateLimitKeys = testCases.map(
  (testCase) => `feedback:submission:guest:${testCase.guestIpHash}`
);

let databaseVerified = false;

function makeGuestFeedbackInput(
  guestIpHash: string,
  message: string
) {
  return {
    type: "IDEA" as const,
    category: null,
    message,
    shopperId: null,
    guestIpHash,
    contactEmail: null,
    contactName: null,
    emailVerifiedBySession: false,
    productId: null,
    productTitleSnapshot: null,
    brandNameSnapshot: null,
    productUrlSnapshot: null,
    pageUrl: null,
  };
}

describe("Real PostgreSQL Feedback persistence", () => {
  beforeAll(async () => {
    await requireLocalFeedbackTestDb(prisma);
    databaseVerified = true;
  });

  afterAll(async () => {
    const cleanupErrors: unknown[] = [];

    try {
      if (!databaseVerified) return;

      try {
        await requireLocalFeedbackTestDb(prisma);

        await prisma.feedbackSubmission.deleteMany({
          where: {
            message: {
              in: testMessages,
            },
            shopperId: null,
          },
        });
      } catch (error) {
        cleanupErrors.push(error);
      }

      try {
        await requireLocalFeedbackTestDb(prisma);

        await prisma.rateLimit.deleteMany({
          where: {
            key: {
              in: testRateLimitKeys,
            },
          },
        });
      } catch (error) {
        cleanupErrors.push(error);
      }

      try {
        await requireLocalFeedbackTestDb(prisma);

        const remainingFeedback =
          await prisma.feedbackSubmission.count({
            where: {
              message: {
                in: testMessages,
              },
              shopperId: null,
            },
          });

        const remainingRateLimits =
          await prisma.rateLimit.count({
            where: {
              key: {
                in: testRateLimitKeys,
              },
            },
          });

        expect(remainingFeedback).toBe(0);
        expect(remainingRateLimits).toBe(0);
      } catch (error) {
        cleanupErrors.push(error);
      }

      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          cleanupErrors,
          "Feedback integration cleanup failed."
        );
      }

      console.log(
        "PASS: Both synthetic Feedback identities cleaned up."
      );
    } finally {
      await prisma.$disconnect();
    }
  });
  it("persists one guest Idea and its rate-limit counter", async () => {
    await requireLocalFeedbackTestDb(prisma);

    const result = await createFeedbackSubmission(
      makeGuestFeedbackInput(
        persistenceGuestIpHash,
        persistenceMessage
      )
    );

    expect(result.status).toBe("CREATED");

    if (result.status !== "CREATED") {
      throw new Error(`Unexpected result: ${result.status}`);
    }

    const stored = await prisma.feedbackSubmission.findUnique({
      where: {
        id: result.id,
      },
    });

    expect(stored).toMatchObject({
      id: result.id,
      type: "IDEA",
      message: persistenceMessage,
      status: "NEW",
      shopperId: null,
      duplicateCount: 0,
      adminEmailStatus: "PENDING",
      shopperEmailStatus: "NOT_APPLICABLE",
    });

    expect(stored?.dedupeKey).toBeTruthy();
    expect(stored?.dedupeExpiresAt).toBeInstanceOf(Date);

    const limit = await prisma.rateLimit.findUnique({
      where: {
        key: testRateLimitKeys[0],
      },
    });

    expect(limit?.count).toBe(1);
    expect(limit?.resetAt).toBeInstanceOf(Date);

    console.log("PASS: Guest Feedback persisted correctly.");
  });

  it("recognises duplicate guest Feedback without consuming another allowance", async () => {
    await requireLocalFeedbackTestDb(prisma);

    const input = makeGuestFeedbackInput(
      duplicateGuestIpHash,
      duplicateMessage
    );

    const first = await createFeedbackSubmission(input);

    expect(first.status).toBe("CREATED");

    if (first.status !== "CREATED") {
      throw new Error(`Unexpected first result: ${first.status}`);
    }

    await requireLocalFeedbackTestDb(prisma);

    const second = await createFeedbackSubmission(input);

    expect(second).toEqual({
      status: "DUPLICATE",
      id: first.id,
      duplicate: true,
    });

    const matchingFeedback =
      await prisma.feedbackSubmission.findMany({
        where: {
          message: duplicateMessage,
          shopperId: null,
        },
      });

    expect(matchingFeedback).toHaveLength(1);

    expect(matchingFeedback[0]).toMatchObject({
      id: first.id,
      duplicateCount: 1,
    });

    const limit = await prisma.rateLimit.findUnique({
      where: {
        key: testRateLimitKeys[1],
      },
    });

    expect(limit?.count).toBe(1);

    console.log(
      "PASS: Duplicate recognised without consuming another allowance."
    );
  });
});