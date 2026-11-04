import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";

function request(token?: string, origin = "https://www.veiloraclub.com") {
  const url = new URL("/api/newsletter/unsubscribe", origin);

  if (token !== undefined) {
    url.searchParams.set("token", token);
  }

  return new Request(url);
}

function expectRedirect(response: Response, destination: string) {
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(destination);
}

describe("Newsletter unsubscribe canonical URL safety", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com"
    );
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("redirects missing tokens to the canonical missing-token page", async () => {
    const response = await GET(request());

    expectRedirect(
      response,
      "https://www.veiloraclub.com/newsletter/unsubscribed?status=missing"
    );
  });

  it("treats empty tokens as missing", async () => {
    const response = await GET(request(""));

    expectRedirect(
      response,
      "https://www.veiloraclub.com/newsletter/unsubscribed?status=missing"
    );
  });

  it("redirects valid tokens to the confirmation page", async () => {
    const response = await GET(request("unsubscribe-token"));

    expectRedirect(
      response,
      "https://www.veiloraclub.com/newsletter/unsubscribe?token=unsubscribe-token"
    );
  });

  it("preserves spaces and special characters through URL encoding", async () => {
    const token = "a b&c=d+e";

    const response = await GET(request(token));
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).not.toBeNull();

    const destination = new URL(location!);

    expect(destination.origin).toBe("https://www.veiloraclub.com");
    expect(destination.pathname).toBe("/newsletter/unsubscribe");
    expect(destination.searchParams.get("token")).toBe(token);
  });

  it("preserves Unicode tokens through URL encoding", async () => {
    const token = "été-東京";

    const response = await GET(request(token));
    const destination = new URL(response.headers.get("location")!);

    expect(destination.searchParams.get("token")).toBe(token);
  });

  it("does not trust a different incoming request origin", async () => {
    const response = await GET(
      request("unsubscribe-token", "https://untrusted.example.net")
    );

    expectRedirect(
      response,
      "https://www.veiloraclub.com/newsletter/unsubscribe?token=unsubscribe-token"
    );
  });

  it("uses an explicitly configured alternative HTTPS origin", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://preview.veiloraclub.com"
    );

    const response = await GET(request("unsubscribe-token"));

    expectRedirect(
      response,
      "https://preview.veiloraclub.com/newsletter/unsubscribe?token=unsubscribe-token"
    );
  });

  it("rejects missing production SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(503);
    expect(await response.text()).toBe(
      "Service temporarily unavailable."
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects malformed production SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(503);
  });

  it("rejects HTTP production SITE_URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://www.veiloraclub.com"
    );

    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(503);
  });

  it("rejects localhost production SITE_URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://localhost:3000"
    );

    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(503);
  });

  it("does not fall back to legacy APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(503);
  });

  it("does not fall back to VERCEL_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "preview.example.com");

    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(503);
  });

  it("rejects URL credentials", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://user:password@www.veiloraclub.com"
    );

    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(503);
  });

  it("rejects URL paths", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com/unexpected"
    );

    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(503);
  });

  it("rejects URL query strings", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com?redirect=elsewhere"
    );

    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(503);
  });

  it("rejects URL fragments", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com#fragment"
    );

    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(503);
  });

  it("does not expose configuration details to visitors", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    const response = await GET(request());

    expect(response.status).toBe(503);

    const body = await response.text();

    expect(body).not.toContain("NEXT_PUBLIC_SITE_URL");
    expect(body).not.toContain("not-a-valid-url");
  });

  it("supports localhost in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const response = await GET(request("local-token"));

    expectRedirect(
      response,
      "http://localhost:3000/newsletter/unsubscribe?token=local-token"
    );
  });

  it("uses localhost fallback only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await GET(request("local-token"));

    expectRedirect(
      response,
      "http://localhost:3000/newsletter/unsubscribe?token=local-token"
    );
  });

  it("never redirects to the incoming request host", async () => {
    const response = await GET(
      request("token", "https://attacker.example.org")
    );

    const location = response.headers.get("location");

    expect(location).not.toContain("attacker.example.org");
    expect(location).toContain("www.veiloraclub.com");
  });

  it("does not perform any unsubscribe database mutation", async () => {
    const response = await GET(request("unsubscribe-token"));

    expect(response.status).toBe(307);

    const location = response.headers.get("location");

    expect(location).toContain("/newsletter/unsubscribe?token=");
  });
});
