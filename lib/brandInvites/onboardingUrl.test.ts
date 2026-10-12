import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getBrandOnboardingUrl } from "./onboardingUrl";

describe("brand onboarding URL configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses localhost during development when no URL is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    expect(getBrandOnboardingUrl("test-token")).toBe(
      "http://localhost:3000/brand/onboarding?token=test-token"
    );
  });

  it("uses the configured HTTPS domain in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://veiloraclub.com"
    );

    expect(getBrandOnboardingUrl("test-token")).toBe(
      "https://veiloraclub.com/brand/onboarding?token=test-token"
    );
  });

  it("rejects a missing production URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    expect(() => getBrandOnboardingUrl("test-token")).toThrow(
      "NEXT_PUBLIC_SITE_URL must be configured"
    );
  });

  it("rejects localhost in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://localhost:3000"
    );

    expect(() => getBrandOnboardingUrl("test-token")).toThrow(
      "Production onboarding URL must use a public HTTPS domain"
    );
  });

  it("rejects HTTP in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://veiloraclub.com"
    );

    expect(() => getBrandOnboardingUrl("test-token")).toThrow(
      "Production onboarding URL must use a public HTTPS domain"
    );
  });
});