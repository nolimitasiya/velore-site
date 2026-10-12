import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();

  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

import { readFileSync } from "node:fs";
import { assertDevelopmentDatabase } from "./assertDevelopmentDatabase";

const mockedReadFileSync = vi.mocked(readFileSync);

const DEV_REF = "fictional-development-project";
const PROD_REF = "fictional-production-project";

function connection(ref: string): string {
  return `postgresql://postgres:placeholder@db.${ref}.supabase.co:5432/postgres`;
}

function configureFiles(): void {
  mockedReadFileSync.mockImplementation((path) => {
    const filename = String(path);

    if (filename.endsWith(".env.development.test")) {
      return [
        `DATABASE_URL=${connection(DEV_REF)}`,
        `DIRECT_URL=${connection(DEV_REF)}`,
      ].join("\n");
    }

    if (filename.endsWith(".env.local")) {
      return [
        `DATABASE_URL=${connection(PROD_REF)}`,
        `DIRECT_URL=${connection(PROD_REF)}`,
      ].join("\n");
    }

    throw new Error("Unexpected configuration file.");
  });
}

describe("development database safety guard", () => {
  it("rejects execution without the integration-test flag", () => {
    vi.stubEnv("VEILORA_DEV_INTEGRATION_TEST", "false");

    expect(() => assertDevelopmentDatabase()).toThrow(
      "Development integration-test flag is missing.",
    );

    vi.unstubAllEnvs();
  });

  it("rejects execution when security auditing is enabled", () => {
    vi.stubEnv("VEILORA_DEV_INTEGRATION_TEST", "true");
    vi.stubEnv("SECURITY_AUDIT_ENABLED", "true");

    expect(() => assertDevelopmentDatabase()).toThrow(
      "Security auditing must be disabled",
    );

    vi.unstubAllEnvs();
  });

  it("rejects execution without active database configuration", () => {
    vi.stubEnv("VEILORA_DEV_INTEGRATION_TEST", "true");
    vi.stubEnv("SECURITY_AUDIT_ENABLED", "false");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DIRECT_URL", "");

    expect(() => assertDevelopmentDatabase()).toThrow(
      "Active database configuration is missing.",
    );

    vi.unstubAllEnvs();
  });

  it("rejects a production database connection", () => {
    configureFiles();

    vi.stubEnv("VEILORA_DEV_INTEGRATION_TEST", "true");
    vi.stubEnv("SECURITY_AUDIT_ENABLED", "false");

    vi.stubEnv("DATABASE_URL", connection(PROD_REF));
    vi.stubEnv("DIRECT_URL", connection(PROD_REF));

    expect(() => assertDevelopmentDatabase()).toThrow(
      "Active connection does not target the development project.",
    );

    vi.unstubAllEnvs();
  });

  it("rejects mixed development and production connections", () => {
    configureFiles();

    vi.stubEnv("VEILORA_DEV_INTEGRATION_TEST", "true");
    vi.stubEnv("SECURITY_AUDIT_ENABLED", "false");

    vi.stubEnv("DATABASE_URL", connection(DEV_REF));
    vi.stubEnv("DIRECT_URL", connection(PROD_REF));

    expect(() => assertDevelopmentDatabase()).toThrow(
      "Active connection does not target the development project.",
    );

    vi.unstubAllEnvs();
  });

  it("accepts matching development configuration", () => {
    configureFiles();

    vi.stubEnv("VEILORA_DEV_INTEGRATION_TEST", "true");
    vi.stubEnv("SECURITY_AUDIT_ENABLED", "false");

    vi.stubEnv("DATABASE_URL", connection(DEV_REF));
    vi.stubEnv("DIRECT_URL", connection(DEV_REF));

    expect(() => assertDevelopmentDatabase()).not.toThrow();

    vi.unstubAllEnvs();
  });
});
