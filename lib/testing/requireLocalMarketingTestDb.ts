import type { PrismaClient } from "@prisma/client";

const EXPECTED_DATABASE = "veilora_marketing_consent_test_20261111";
const EXPECTED_HOST = "127.0.0.1";
const EXPECTED_PORT = 5432;

export async function requireLocalMarketingTestDb(
  prisma: PrismaClient
): Promise<void> {
  if (process.env.RUN_LOCAL_MARKETING_DB_TESTS !== "1") {
    throw new Error(
      "Marketing database integration tests are disabled."
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
      decodeURIComponent(url.pathname.slice(1)) !== EXPECTED_DATABASE ||
      url.searchParams.has("host") ||
      url.searchParams.has("hostaddr") ||
      url.searchParams.has("service")
    ) {
      throw new Error(
        `${name} does not point to the isolated local marketing database.`
      );
    }
  }

  const [identity] = await prisma.$queryRaw<
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
    !identity?.correct_database ||
    !identity.local_server ||
    !identity.correct_port
  ) {
    throw new Error(
      "Marketing database identity verification failed."
    );
  }
}