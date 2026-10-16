import { afterEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { requireLocalSecurityTestDb } from "./requireLocalSecurityTestDb";

const originalPermission = process.env.RUN_LOCAL_SECURITY_DB_TESTS;

afterEach(() => {
  if (originalPermission === undefined) {
    delete process.env.RUN_LOCAL_SECURITY_DB_TESTS;
  } else {
    process.env.RUN_LOCAL_SECURITY_DB_TESTS = originalPermission;
  }
});

describe("Local security database guard", () => {
  it("refuses to run without explicit permission", async () => {
    delete process.env.RUN_LOCAL_SECURITY_DB_TESTS;

    await expect(
      requireLocalSecurityTestDb({} as PrismaClient)
    ).rejects.toThrow("Database integration tests are disabled");
  });

  it("accepts the verified isolated local database", async () => {
    process.env.RUN_LOCAL_SECURITY_DB_TESTS = "1";

    const prisma = new PrismaClient();

    try {
      await expect(
        requireLocalSecurityTestDb(prisma)
      ).resolves.toBeUndefined();
    } finally {
      await prisma.$disconnect();
    }
  });
});