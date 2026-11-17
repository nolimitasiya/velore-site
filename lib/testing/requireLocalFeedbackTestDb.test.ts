import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { PrismaClient } from "@prisma/client";
import { requireLocalFeedbackTestDb } from "./requireLocalFeedbackTestDb";

const SAFE_URL =
  "postgresql://veilora_feedback_test_runner:test-password@" +
  "127.0.0.1:5432/veilora_feedback_integration_20261105?schema=public";

const validIdentity = {
  correct_database: true,
  local_server: true,
  correct_port: true,
  correct_role: true,
  correct_owner: true,
  feedback_table_exists: true,
  rate_limit_table_exists: true,
};

function mockPrisma(identity = validIdentity) {
  const queryRaw = vi.fn().mockResolvedValue([identity]);

  return {
    client: {
      $queryRaw: queryRaw,
    } as unknown as PrismaClient,
    queryRaw,
  };
}

describe("Feedback integration database safety guard", () => {
  beforeEach(() => {
    process.env.RUN_LOCAL_FEEDBACK_DB_TESTS = "1";
    process.env.DATABASE_URL = SAFE_URL;
    process.env.DIRECT_URL = SAFE_URL;
  });

  afterEach(() => {
    delete process.env.RUN_LOCAL_FEEDBACK_DB_TESTS;
    delete process.env.DATABASE_URL;
    delete process.env.DIRECT_URL;
    vi.restoreAllMocks();
  });

  it("rejects missing explicit authorisation", async () => {
    delete process.env.RUN_LOCAL_FEEDBACK_DB_TESTS;

    const { client, queryRaw } = mockPrisma();

    await expect(
      requireLocalFeedbackTestDb(client)
    ).rejects.toThrow("disabled");

    expect(queryRaw).not.toHaveBeenCalled();
  });

  it.each(["DATABASE_URL", "DIRECT_URL"])(
    "rejects missing %s",
    async (name) => {
      delete process.env[name];

      const { client, queryRaw } = mockPrisma();

      await expect(
        requireLocalFeedbackTestDb(client)
      ).rejects.toThrow("missing");

      expect(queryRaw).not.toHaveBeenCalled();
    }
  );

  it.each([
    [
      "incorrect database",
      "postgresql://veilora_feedback_test_runner:test-password@" +
        "127.0.0.1:5432/postgres?schema=public",
    ],
    [
      "incorrect host",
      "postgresql://veilora_feedback_test_runner:test-password@" +
        "localhost:5432/veilora_feedback_integration_20261105?schema=public",
    ],
    [
      "incorrect role",
      "postgresql://postgres:test-password@" +
        "127.0.0.1:5432/veilora_feedback_integration_20261105?schema=public",
    ],
    [
      "incorrect schema",
      "postgresql://veilora_feedback_test_runner:test-password@" +
        "127.0.0.1:5432/veilora_feedback_integration_20261105?schema=other",
    ],
    [
      "connection override",
      SAFE_URL + "&host=remote.example",
    ],
    [
      "invalid URL",
      "not-a-database-url",
    ],
  ])("rejects %s", async (_label, unsafeUrl) => {
    process.env.DIRECT_URL = unsafeUrl;

    const { client, queryRaw } = mockPrisma();

    await expect(
      requireLocalFeedbackTestDb(client)
    ).rejects.toThrow();

    expect(queryRaw).not.toHaveBeenCalled();
  });

  it.each([
    "correct_database",
    "local_server",
    "correct_port",
    "correct_role",
    "correct_owner",
    "feedback_table_exists",
    "rate_limit_table_exists",
  ] as const)(
    "rejects incorrect live identity: %s",
    async (field) => {
      const { client } = mockPrisma({
        ...validIdentity,
        [field]: false,
      });

      await expect(
        requireLocalFeedbackTestDb(client)
      ).rejects.toThrow("identity verification failed");
    }
  );

  it("accepts the exact authorised configuration", async () => {
    const { client, queryRaw } = mockPrisma();

    await expect(
      requireLocalFeedbackTestDb(client)
    ).resolves.toBeUndefined();

    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});