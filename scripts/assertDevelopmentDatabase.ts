import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readEnvValue(file: string, name: string): string {
  const content = readFileSync(resolve(process.cwd(), file), "utf8");

  const matches = content
    .split(/\r?\n/)
    .filter((line) => new RegExp(`^\\s*${name}\\s*=`).test(line));

  const last = matches.at(-1);

  if (!last) {
    throw new Error(`Missing required configuration: ${name}`);
  }

  const value = last.split("=").slice(1).join("=").trim();

  if (!value) {
    throw new Error(`Empty required configuration: ${name}`);
  }

  return value.replace(/^["']|["']$/g, "");
}

function projectRef(connectionString: string): string {
  const url = new URL(connectionString);

  const direct = /^db\.([^.]+)\.supabase\.co$/i.exec(url.hostname);

  if (direct) {
    return direct[1];
  }

  if (/pooler\.supabase\.com$/i.test(url.hostname)) {
    const username = decodeURIComponent(url.username);
    const match = /^postgres\.(.+)$/.exec(username);

    if (match) {
      return match[1];
    }
  }

  throw new Error("Unrecognised Supabase connection format.");
}

export function assertDevelopmentDatabase(): void {
  if (process.env.VEILORA_DEV_INTEGRATION_TEST !== "true") {
    throw new Error("Development integration-test flag is missing.");
  }

  if (process.env.SECURITY_AUDIT_ENABLED !== "false") {
    throw new Error("Security auditing must be disabled for integration tests.");
  }

  const activeDatabaseUrl = process.env.DATABASE_URL;
  const activeDirectUrl = process.env.DIRECT_URL;

  if (!activeDatabaseUrl || !activeDirectUrl) {
    throw new Error("Active database configuration is missing.");
  }

  const expectedDevDatabaseUrl = readEnvValue(
    ".env.development.test",
    "DATABASE_URL",
  );

  const expectedDevDirectUrl = readEnvValue(
    ".env.development.test",
    "DIRECT_URL",
  );

  const productionDatabaseUrl = readEnvValue(
    ".env.local",
    "DATABASE_URL",
  );

  const productionDirectUrl = readEnvValue(
    ".env.local",
    "DIRECT_URL",
  );

  const activeRef = projectRef(activeDatabaseUrl);
  const activeDirectRef = projectRef(activeDirectUrl);

  const devRef = projectRef(expectedDevDatabaseUrl);
  const devDirectRef = projectRef(expectedDevDirectUrl);

  const prodRef = projectRef(productionDatabaseUrl);
  const prodDirectRef = projectRef(productionDirectUrl);

  if (devRef !== devDirectRef || prodRef !== prodDirectRef) {
    throw new Error("Database configuration project mismatch.");
  }

  if (devRef === prodRef) {
    throw new Error("Development and production projects must differ.");
  }

  if (activeRef !== devRef || activeDirectRef !== devRef) {
    throw new Error("Active connection does not target the development project.");
  }

  console.log("PASS: Independent development database safety check.");
}
