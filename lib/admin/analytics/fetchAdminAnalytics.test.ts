import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockCookies, mockGetVercelOidcToken } = vi.hoisted(() => ({
  mockCookies: vi.fn(),
  mockGetVercelOidcToken: vi.fn(),
}));

vi.mock("@vercel/oidc", () => ({
  getVercelOidcToken: mockGetVercelOidcToken,
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

import { fetchAdminAnalytics } from "./fetchAdminAnalytics";

const originalFetch = globalThis.fetch;

function configureLocal() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL_URL", "");
}

function configureVercel(
  environment: "production" | "preview",
  hostname: string
) {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", environment);
  vi.stubEnv("VERCEL_URL", hostname);
}

describe("fetchAdminAnalytics security contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureLocal();
    mockGetVercelOidcToken.mockResolvedValue("synthetic-test-oidc-token");

    mockCookies.mockResolvedValue({
      get: vi.fn((name: string) =>
        name === "admin_authed"
          ? { value: "safe-admin-token" }
          : undefined
      ),
      toString: vi.fn(() => "admin_authed=safe-admin-token; shopper=secret"),
    });

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("fetches an approved analytics endpoint", async () => {
    const response = await fetchAdminAnalytics(
      "/api/admin/analytics/index-overview?range=30d"
    );

    expect(response.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledOnce();

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0];

    expect(url).toBe(
      "http://localhost:3000/api/admin/analytics/index-overview?range=30d"
    );

    expect(options).toMatchObject({
      method: "GET",
      cache: "no-store",
      redirect: "error",
      headers: {
        cookie: "admin_authed=safe-admin-token",
      },
    });
  });

  it("does not forward unrelated cookies", async () => {
    await fetchAdminAnalytics("/api/admin/analytics/summary");

    const options = vi.mocked(globalThis.fetch).mock.calls[0][1];
    const cookie = (options?.headers as Record<string, string>).cookie;

    expect(cookie).toBe("admin_authed=safe-admin-token");
    expect(cookie).not.toContain("shopper");
  });

  it.each([
    "https://evil.example/api/admin/analytics/summary",
    "//evil.example/api/admin/analytics/summary",
    "/api/admin/feedback",
    "/api/admin/analytics",
    "/api/admin/analytics/../feedback",
    "/api/admin/analytics/%2e%2e/feedback",
    "/api/admin/analytics/%2E%2E/feedback",
    "/api/admin/analytics/%2f%2fevil.example",
    "/api/admin/analytics/%5cfeedback",
    "/api/admin/analytics/%",
    "/api/admin/analytics/summary#fragment",
    "/api/admin/analytics/summary\\escape",
  ])("rejects unsafe analytics path: %s", async (path) => {
    await expect(fetchAdminAnalytics(path)).rejects.toThrow();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects missing Admin authentication", async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn(() => undefined),
    });

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow("Admin authentication is required.");

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    "token; shopper=secret",
    "token\r\nInjected: true",
  ])("rejects unsafe cookie value", async (token) => {
    mockCookies.mockResolvedValue({
      get: vi.fn(() => ({ value: token })),
    });

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow("Invalid Admin authentication cookie.");

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects a missing Vercel deployment hostname", async () => {
    configureVercel("preview", "veilora-preview.vercel.app");
    vi.stubEnv("VERCEL_URL", "");

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockGetVercelOidcToken).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    "https://example.com",
    "example.com/path",
    "example.com:443",
    "user@example.com",
    "example.com?x=1",
    "example.com#fragment",
    "not-a-url",
    "nested.preview.vercel.app",
    "www.veiloraclub.com",
  ])("rejects unapproved deployment hostname: %s", async (hostname) => {
    configureVercel("preview", "veilora-preview.vercel.app");
    vi.stubEnv("VERCEL_URL", hostname);

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockGetVercelOidcToken).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects production without deployment identity", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("accepts matching Vercel production origin", async () => {
    configureVercel("production", "veilora-production.vercel.app");

    await fetchAdminAnalytics("/api/admin/analytics/summary");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://veilora-production.vercel.app/api/admin/analytics/summary",
      expect.objectContaining({
        redirect: "error",
        cache: "no-store",
        headers: {
          cookie: "admin_authed=safe-admin-token",
          "x-vercel-trusted-oidc-idp-token": "synthetic-test-oidc-token",
        },
      })
    );

    expect(mockGetVercelOidcToken).toHaveBeenCalledOnce();
  });

  it("accepts matching Vercel preview origin", async () => {
    configureVercel("preview", "veilora-preview.vercel.app");

    await fetchAdminAnalytics("/api/admin/analytics/summary");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://veilora-preview.vercel.app/api/admin/analytics/summary",
      expect.objectContaining({
        redirect: "error",
        cache: "no-store",
        headers: {
          cookie: "admin_authed=safe-admin-token",
          "x-vercel-trusted-oidc-idp-token": "synthetic-test-oidc-token",
        },
      })
    );

    expect(mockGetVercelOidcToken).toHaveBeenCalledOnce();
  });

  it("rejects preview deployment using the production custom domain", async () => {
    configureVercel("preview", "www.veiloraclub.com");

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockGetVercelOidcToken).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects production deployment using a non-Vercel hostname", async () => {
    configureVercel("production", "www.veiloraclub.com");

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockGetVercelOidcToken).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects a protocol-prefixed Vercel deployment hostname", async () => {
    configureVercel("preview", "veilora-preview.vercel.app");
    vi.stubEnv("VERCEL_URL", "http://veilora-preview.vercel.app");

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockGetVercelOidcToken).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid Vercel environment", async () => {
    configureVercel("preview", "veilora-preview.vercel.app");
    vi.stubEnv("VERCEL_ENV", "unknown");

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    "/api/admin/analytics/%252e%252e/feedback",
    "/api/admin/analytics/%252fexternal",
    "/api/admin/analytics/%255cexternal",
    "/api/admin/analytics/%2e%2e%2ffeedback",
    "/api/admin/analytics/%2e%2e%5cfeedback",
    "/api/admin/analytics/%00",
  ])("rejects nested or encoded unsafe path: %s", async (path) => {
    await expect(fetchAdminAnalytics(path)).rejects.toThrow();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects URL fragments in analytics requests", async () => {
    await expect(
      fetchAdminAnalytics(
        "/api/admin/analytics/summary?range=30d#external"
      )
    ).rejects.toThrow();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    "/api/admin/analytics/summary?range=%",
    "/api/admin/analytics/summary?next=https://evil.example",
  ])(
    "keeps query parameters on the approved analytics origin: %s",
    async (path) => {
      await fetchAdminAnalytics(path);

      expect(globalThis.fetch).toHaveBeenCalledOnce();

      const [destination, options] =
        vi.mocked(globalThis.fetch).mock.calls[0];

      const url = new URL(String(destination));

      expect(url.origin).toBe("http://localhost:3000");
      expect(url.pathname).toBe("/api/admin/analytics/summary");

      expect(options).toMatchObject({
        method: "GET",
        cache: "no-store",
        redirect: "error",
        headers: {
          cookie: "admin_authed=safe-admin-token",
        },
      });
    }
  );

  it.each([
    "https://evil.example",
    "evil.example/path",
    "evil.example:443",
    "user@evil.example",
    "evil.example?next=external",
    "evil..example",
    "-evil.example",
    "evil.example-",
  ])("rejects malformed deployment hostname: %s", async (hostname) => {
    configureVercel("preview", "veilora-preview.vercel.app");
    vi.stubEnv("VERCEL_URL", hostname);

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects a redirect response from the approved origin", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(
      new TypeError("Redirect mode is set to error")
    );

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/analytics/summary",
      expect.objectContaining({
        redirect: "error",
        cache: "no-store",
      })
    );
  });
  it("uses localhost:3000 in local development", async () => {
    configureLocal();

    await fetchAdminAnalytics("/api/admin/analytics/summary");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/analytics/summary",
      expect.objectContaining({
        redirect: "error",
        cache: "no-store",
      })
    );
  });
});

describe("OIDC adversarial security contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    configureVercel("preview", "veilora-preview.vercel.app");

    mockGetVercelOidcToken.mockResolvedValue("synthetic-test-oidc-token");

    mockCookies.mockResolvedValue({
      get: vi.fn((name: string) =>
        name === "admin_authed"
          ? { value: "safe-admin-token" }
          : undefined
      ),
      toString: vi.fn(
        () => "admin_authed=safe-admin-token; shopper=private-value"
      ),
    });

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("fails closed when OIDC token retrieval throws", async () => {
    mockGetVercelOidcToken.mockRejectedValue(
      new Error("sensitive-internal-token-details")
    );

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow(
      "Admin analytics deployment authentication unavailable."
    );

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does not expose the underlying token retrieval error", async () => {
    mockGetVercelOidcToken.mockRejectedValue(
      new Error("sensitive-internal-token-details")
    );

    let message = "";

    try {
      await fetchAdminAnalytics("/api/admin/analytics/summary");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toBe(
      "Admin analytics deployment authentication unavailable."
    );

    expect(message).not.toContain("sensitive-internal-token-details");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(["", "   "])(
    "rejects an empty or whitespace-only OIDC token: %j",
    async (value) => {
      mockGetVercelOidcToken.mockResolvedValue(value);

      await expect(
        fetchAdminAnalytics("/api/admin/analytics/summary")
      ).rejects.toThrow(
        "Admin analytics deployment authentication unavailable."
      );

      expect(globalThis.fetch).not.toHaveBeenCalled();
    }
  );

  it("does not request OIDC without an Admin session cookie", async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn(() => undefined),
    });

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(mockGetVercelOidcToken).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does not request OIDC for an invalid deployment hostname", async () => {
    vi.stubEnv("VERCEL_URL", "untrusted.example.com");

    await expect(
      fetchAdminAnalytics("/api/admin/analytics/summary")
    ).rejects.toThrow();

    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockGetVercelOidcToken).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does not request or forward OIDC during local development", async () => {
    configureLocal();

    await fetchAdminAnalytics("/api/admin/analytics/summary");

    expect(mockGetVercelOidcToken).not.toHaveBeenCalled();

    const options = vi.mocked(globalThis.fetch).mock.calls[0][1];

    expect(options?.headers).toEqual({
      cookie: "admin_authed=safe-admin-token",
    });
  });

  it("forwards only approved authentication headers on Vercel", async () => {
    await fetchAdminAnalytics("/api/admin/analytics/summary");

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0];

    expect(url).toBe(
      "https://veilora-preview.vercel.app/api/admin/analytics/summary"
    );

    expect(options).toMatchObject({
      method: "GET",
      cache: "no-store",
      redirect: "error",
    });

    expect(options?.headers).toEqual({
      cookie: "admin_authed=safe-admin-token",
      "x-vercel-trusted-oidc-idp-token": "synthetic-test-oidc-token",
    });

    expect(JSON.stringify(options?.headers)).not.toContain(
      "shopper=private-value"
    );
  });
});
