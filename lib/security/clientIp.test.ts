import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getVercelClientIp } from "./clientIp";

const originalVercel = process.env.VERCEL;

function makeRequest(ipHeader?: string) {
  const headers = new Headers();

  if (ipHeader !== undefined) {
    headers.set("x-forwarded-for", ipHeader);
  }

  return new Request("https://example.com/api/admin/auth/login", {
    headers,
  });
}

describe("getVercelClientIp", () => {
  beforeEach(() => {
    process.env.VERCEL = "1";
  });

  afterEach(() => {
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  });

  it("returns null outside Vercel", () => {
    delete process.env.VERCEL;

    expect(getVercelClientIp(makeRequest("203.0.113.10"))).toBeNull();
  });

  it("accepts a single valid IPv4 address", () => {
    expect(getVercelClientIp(makeRequest("203.0.113.10"))).toBe("203.0.113.10");
  });

  it("accepts a single valid IPv6 address", () => {
    expect(getVercelClientIp(makeRequest("2001:db8::1"))).toBe("2001:db8::1");
  });

  it("rejects multiple forwarded addresses", () => {
    expect(
      getVercelClientIp(makeRequest("203.0.113.10, 198.51.100.20")),
    ).toBeNull();
  });

  it("rejects malformed IP addresses", () => {
    expect(getVercelClientIp(makeRequest("not-an-ip"))).toBeNull();
  });

  it("returns null when the header is missing", () => {
    expect(getVercelClientIp(makeRequest())).toBeNull();
  });
});
