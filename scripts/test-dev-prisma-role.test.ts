import { assertDevelopmentDatabase } from "./assertDevelopmentDatabase";
import { test, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { prisma } from "@/lib/prisma";

test.skipIf(process.env.VEILORA_DEV_INTEGRATION_TEST !== "true")("development Prisma database role", async () => {
  assertDevelopmentDatabase();

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        executing_role: string;
        session_role: string;
      }>
    >`
      SELECT
        current_user::text AS executing_role,
        session_user::text AS session_role
    `;

    expect(rows).toHaveLength(1);

    const { executing_role, session_role } = rows[0];

    console.log("PRISMA EXECUTING ROLE:", executing_role);
    console.log("PRISMA SESSION ROLE:", session_role);

    expect(executing_role).not.toBe("anon");
    expect(executing_role).not.toBe("authenticated");

    console.log("PASS: Prisma does not use an anonymous API role.");
  } finally {
    await prisma.$disconnect();
  }
}, 30000);
