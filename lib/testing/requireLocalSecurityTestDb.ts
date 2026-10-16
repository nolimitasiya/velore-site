import type { PrismaClient } from "@prisma/client";

const EXPECTED_DATABASE = "veilora_security_migration_test_20261013";
const EXPECTED_HOST = "127.0.0.1";
const EXPECTED_PORT = 5432;

export async function requireLocalSecurityTestDb(
  prisma: PrismaClient
): Promise<void> {
  if (process.env.RUN_LOCAL_SECURITY_DB_TESTS !== "1") {
    throw new Error(
      "Database integration tests are disabled. Set RUN_LOCAL_SECURITY_DB_TESTS=1."
    );
  }

  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    const value = process.env[name];

    if (!value) {
      throw new Error(`${name} is missing.`);
    }

    const url = new URL(value);

    if (
      !["postgresql:", "postgres:"].includes(url.protocol) ||
      url.hostname !== EXPECTED_HOST ||
      Number(url.port || "5432") !== EXPECTED_PORT ||
      decodeURIComponent(url.pathname.slice(1)) !== EXPECTED_DATABASE
    ) {
      throw new Error(
        `${name} does not point to the isolated local security database.`
      );
    }
  }

  const [result] = await prisma.$queryRaw<
    Array<{
      correct_database: boolean;
      local_server: boolean;
      correct_port: boolean;
    }>
  >`
    SELECT
      current_database() = ${EXPECTED_DATABASE}
        AS correct_database,
      inet_server_addr() = inet '127.0.0.1'
        AS local_server,
      inet_server_port() = ${EXPECTED_PORT}
        AS correct_port
  `;

  if (
    !result?.correct_database ||
    !result.local_server ||
    !result.correct_port
  ) {
    throw new Error(
      "Database identity verification failed. Refusing to run integration tests."
    );
  }
}