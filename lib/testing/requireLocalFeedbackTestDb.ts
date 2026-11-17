import type { PrismaClient } from "@prisma/client";

const EXPECTED_DATABASE = "veilora_feedback_integration_20261105";
const EXPECTED_HOST = "127.0.0.1";
const EXPECTED_PORT = 5432;
const EXPECTED_ROLE = "veilora_feedback_test_runner";

export async function requireLocalFeedbackTestDb(
  prisma: PrismaClient
): Promise<void> {
  if (process.env.RUN_LOCAL_FEEDBACK_DB_TESTS !== "1") {
    throw new Error(
      "Feedback integration tests are disabled. " +
        "Set RUN_LOCAL_FEEDBACK_DB_TESTS=1."
    );
  }

  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const value = process.env[name];

    if (!value) {
      throw new Error(`${name} is missing.`);
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} is not a valid database URL.`);
    }

    if (
      !["postgresql:", "postgres:"].includes(url.protocol) ||
      url.hostname !== EXPECTED_HOST ||
      Number(url.port || "5432") !== EXPECTED_PORT ||
      decodeURIComponent(url.pathname.slice(1)) !== EXPECTED_DATABASE ||
      decodeURIComponent(url.username) !== EXPECTED_ROLE ||
      url.searchParams.get("schema") !== "public" ||
      url.searchParams.has("host") ||
      url.searchParams.has("port") ||
      url.searchParams.has("dbname") ||
      url.searchParams.has("database") ||
      url.searchParams.has("service") ||
      url.searchParams.has("socket") ||
      url.searchParams.has("options") ||
      url.hash !== ""
    ) {
      throw new Error(
        `${name} does not point to the dedicated local Feedback database.`
      );
    }
  }

  const [result] = await prisma.$queryRaw<
    Array<{
      correct_database: boolean;
      local_server: boolean;
      correct_port: boolean;
      correct_role: boolean;
      correct_owner: boolean;
      feedback_table_exists: boolean;
      rate_limit_table_exists: boolean;
    }>
  >`
    SELECT
      current_database() = ${EXPECTED_DATABASE}
        AS correct_database,
      inet_server_addr() = inet '127.0.0.1'
        AS local_server,
      inet_server_port() = ${EXPECTED_PORT}
        AS correct_port,
      current_user = ${EXPECTED_ROLE}
        AS correct_role,
      (
        SELECT pg_get_userbyid(datdba) = ${EXPECTED_ROLE}
        FROM pg_database
        WHERE datname = current_database()
      ) AS correct_owner,
      to_regclass('public."FeedbackSubmission"') IS NOT NULL
        AS feedback_table_exists,
      to_regclass('public."RateLimit"') IS NOT NULL
        AS rate_limit_table_exists
  `;

  if (
    !result?.correct_database ||
    !result.local_server ||
    !result.correct_port ||
    !result.correct_role ||
    !result.correct_owner ||
    !result.feedback_table_exists ||
    !result.rate_limit_table_exists
  ) {
    throw new Error(
      "Feedback database identity verification failed. " +
        "Refusing to run integration tests."
    );
  }
}