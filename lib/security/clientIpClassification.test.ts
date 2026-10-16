import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { classifyClientIp } from "./clientIpClassification";

const originalVercel = process.env.VERCEL;

function makeRequest(
  headers: Record<string, string> = {},
) {
  return new Request("https://example.com/api/test", {
    headers,
  });
}

describe("classifyClientIp", () => {
  beforeEach(() => {
    delete process.env.VERCEL;
  });

  afterEach(() => {
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  });

  it("classifies valid IPv4 as unverified outside Vercel", () => {
    expect(
      classifyClientIp(
        makeRequest({
          "x-forwarded-for": "203.0.113.10",
        }),
      ),
    ).toEqual({
      status: "UNVERIFIED",
      candidate: "203.0.113.10",
      source: "x-forwarded-for",
    });
  });

  it("classifies valid IPv6 as unverified outside Vercel", () => {
    expect(
      classifyClientIp(
        makeRequest({
          "x-forwarded-for": "2001:db8::1",
        }),
      ),
    ).toEqual({
      status: "UNVERIFIED",
      candidate: "2001:db8::1",
      source: "x-forwarded-for",
    });
  });

  it("classifies valid IPv4 as trusted in Vercel runtime", () => {
    process.env.VERCEL = "1";

    expect(
      classifyClientIp(
        makeRequest({
          "x-forwarded-for": "203.0.113.10",
        }),
      ),
    ).toEqual({
      status: "TRUSTED",
      candidate: "203.0.113.10",
      source: "x-forwarded-for",
    });
  });

  it("classifies valid IPv6 as trusted in Vercel runtime", () => {
    process.env.VERCEL = "1";

    expect(
      classifyClientIp(
        makeRequest({
          "x-forwarded-for": "2001:db8::1",
        }),
      ),
    ).toEqual({
      status: "TRUSTED",
      candidate: "2001:db8::1",
      source: "x-forwarded-for",
    });
  });

  it("rejects multi-hop forwarded chains", () => {
    process.env.VERCEL = "1";

    expect(
      classifyClientIp(
        makeRequest({
          "x-forwarded-for":
            "203.0.113.10, 198.51.100.20",
        }),
      ),
    ).toEqual({
      status: "UNAVAILABLE",
      candidate: null,
      source: null,
    });
  });

  it("rejects malformed IP addresses", () => {
    process.env.VERCEL = "1";

    expect(
      classifyClientIp(
        makeRequest({
          "x-forwarded-for": "not-an-ip",
        }),
      ),
    ).toEqual({
      status: "UNAVAILABLE",
      candidate: null,
      source: null,
    });
  });

  it("returns unavailable when the header is missing", () => {
    process.env.VERCEL = "1";

    expect(classifyClientIp(makeRequest())).toEqual({
      status: "UNAVAILABLE",
      candidate: null,
      source: null,
    });
  });

  it("does not fall back to x-real-ip", () => {
    process.env.VERCEL = "1";

    expect(
      classifyClientIp(
        makeRequest({
          "x-real-ip": "203.0.113.10",
        }),
      ),
    ).toEqual({
      status: "UNAVAILABLE",
      candidate: null,
      source: null,
    });
  });

  it("does not fall back to x-vercel-forwarded-for", () => {
    process.env.VERCEL = "1";

    expect(
      classifyClientIp(
        makeRequest({
          "x-vercel-forwarded-for": "203.0.113.10",
        }),
      ),
    ).toEqual({
      status: "UNAVAILABLE",
      candidate: null,
      source: null,
    });
  });

  it("does not trust headers outside Vercel", () => {
    const result = classifyClientIp(
      makeRequest({
        "x-forwarded-for": "203.0.113.10",
      }),
    );

    expect(result.status).toBe("UNVERIFIED");
  });
});