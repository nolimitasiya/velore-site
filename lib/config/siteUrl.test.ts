import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildSiteUrl,
  getSiteBaseUrl,
  getTrustedSiteOrigin,
} from "./siteUrl";

describe("canonical site URL configuration", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();

    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }


  });

  it("accepts localhost in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(getSiteBaseUrl()).toBe("http://localhost:3000");
    expect(getTrustedSiteOrigin()).toBe("http://localhost:3000");
  });

  it("uses localhost when configuration is missing outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(getSiteBaseUrl()).toBe("http://localhost:3000");
  });

  it("rejects missing configuration in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(() => getSiteBaseUrl()).toThrow(
      "NEXT_PUBLIC_SITE_URL must be configured in production."
    );
  });

  it("rejects HTTP in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SITE_URL = "http://www.veiloraclub.com";

    expect(() => getSiteBaseUrl()).toThrow(
      "Production NEXT_PUBLIC_SITE_URL must use HTTPS."
    );
  });

  it("accepts a public HTTPS URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.veiloraclub.com";

    expect(getSiteBaseUrl()).toBe("https://www.veiloraclub.com");
  });

  it("rejects localhost in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SITE_URL = "https://localhost:3000";

    expect(() => getSiteBaseUrl()).toThrow(
      "Production NEXT_PUBLIC_SITE_URL must not use localhost."
    );
  });

  it("rejects IPv4 loopback in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SITE_URL = "https://127.0.0.1";

    expect(() => getSiteBaseUrl()).toThrow(
      "Production NEXT_PUBLIC_SITE_URL must not use localhost."
    );
  });

  it("rejects IPv6 loopback in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SITE_URL = "https://[::1]";

    expect(() => getSiteBaseUrl()).toThrow(
      "Production NEXT_PUBLIC_SITE_URL must not use localhost."
    );
  });

  it("rejects malformed URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not-a-valid-url";

    expect(() => getSiteBaseUrl()).toThrow(
      "NEXT_PUBLIC_SITE_URL is not a valid URL."
    );
  });

  it("rejects unsupported protocols", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "javascript:alert(1)";

    expect(() => getSiteBaseUrl()).toThrow(
      "NEXT_PUBLIC_SITE_URL must use HTTP or HTTPS."
    );
  });

  it("rejects embedded credentials", () => {
    process.env.NEXT_PUBLIC_SITE_URL =
      "https://user:password@www.veiloraclub.com";

    expect(() => getSiteBaseUrl()).toThrow(
      "NEXT_PUBLIC_SITE_URL must not contain credentials."
    );
  });

  it("rejects configured paths", () => {
    process.env.NEXT_PUBLIC_SITE_URL =
      "https://www.veiloraclub.com/store";

    expect(() => getSiteBaseUrl()).toThrow(
      "NEXT_PUBLIC_SITE_URL must not contain a path, query or fragment."
    );
  });

  it("rejects query strings", () => {
    process.env.NEXT_PUBLIC_SITE_URL =
      "https://www.veiloraclub.com?source=test";

    expect(() => getSiteBaseUrl()).toThrow(
      "NEXT_PUBLIC_SITE_URL must not contain a path, query or fragment."
    );
  });

  it("rejects fragments", () => {
    process.env.NEXT_PUBLIC_SITE_URL =
      "https://www.veiloraclub.com#section";

    expect(() => getSiteBaseUrl()).toThrow(
      "NEXT_PUBLIC_SITE_URL must not contain a path, query or fragment."
    );
  });

  it("normalises trailing slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL =
      "https://www.veiloraclub.com/";

    expect(getSiteBaseUrl()).toBe("https://www.veiloraclub.com");
  });

  it("constructs an absolute application URL", () => {
    expect(buildSiteUrl("/account/reset")).toBe(
      "http://localhost:3000/account/reset"
    );
  });

  it("preserves encoded query parameters", () => {
    expect(buildSiteUrl("/account/reset?token=abc%2F123")).toBe(
      "http://localhost:3000/account/reset?token=abc%2F123"
    );
  });

  it("rejects protocol-relative paths", () => {
    expect(() => buildSiteUrl("//evil.example/path")).toThrow(
      "Site URL paths must begin with a single forward slash."
    );
  });

  it("rejects relative paths", () => {
    expect(() => buildSiteUrl("account/reset")).toThrow(
      "Site URL paths must begin with a single forward slash."
    );
  });

  it("rejects backslashes in paths", () => {
    expect(() => buildSiteUrl("/\\evil.example")).toThrow(
      "Site URL paths must begin with a single forward slash."
    );
  });

  describe("extended URL security cases", () => {
    it("rejects hexadecimal loopback addresses in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.NEXT_PUBLIC_SITE_URL = "https://0x7f000001";

      expect(() => getSiteBaseUrl()).toThrow();
    });

    it("rejects integer loopback addresses in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.NEXT_PUBLIC_SITE_URL = "https://2130706433";

      expect(() => getSiteBaseUrl()).toThrow();
    });

    it("rejects octal loopback addresses in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.NEXT_PUBLIC_SITE_URL = "https://0177.0.0.1";

      expect(() => getSiteBaseUrl()).toThrow();
    });

    it("rejects private IPv6 addresses in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.NEXT_PUBLIC_SITE_URL = "https://[fc00::1]";

      expect(() => getSiteBaseUrl()).toThrow();
    });

    it("rejects trailing-dot localhost in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.NEXT_PUBLIC_SITE_URL = "https://localhost.";

      expect(() => getSiteBaseUrl()).toThrow();
    });

    it("rejects trailing-dot internal hostnames in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.NEXT_PUBLIC_SITE_URL = "https://internal.";

      expect(() => getSiteBaseUrl()).toThrow();
    });

    it("rejects reserved test domains in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";

      expect(() => getSiteBaseUrl()).toThrow();
    });

    it("rejects plain dot-segment traversal in application paths", () => {
      expect(() => buildSiteUrl("/account/../admin")).toThrow();
    });

    it("rejects encoded dot-segment traversal in application paths", () => {
      expect(() => buildSiteUrl("/account/%2e%2e/admin")).toThrow();
    });

    it("preserves the trusted origin for encoded slashes", () => {
      const result = new URL(
        buildSiteUrl("/%2F%2Fevil.example/path")
      );

      expect(result.origin).toBe("http://localhost:3000");
    });
  });
  it("rejects private IPv4 addresses in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SITE_URL = "https://192.168.1.10";

    expect(() => getSiteBaseUrl()).toThrow();
  });

  it("rejects non-public hostnames in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SITE_URL = "https://internal";

    expect(() => getSiteBaseUrl()).toThrow();
  });
});