import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getAuthenticatedShopper: vi.fn(),
  classifyClientIp: vi.fn(),
  hashRateLimitIp: vi.fn(),
  rateLimit: vi.fn(),
  createFeedbackSubmission: vi.fn(),
  productFindFirst: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: mocks.productFindFirst,
    },
  },
}));

vi.mock("@/lib/auth/ShopperSession", () => ({
  getAuthenticatedShopper:
    mocks.getAuthenticatedShopper,
}));

vi.mock("@/lib/security/clientIpClassification", () => ({
  classifyClientIp: mocks.classifyClientIp,
}));

vi.mock("@/lib/security/hashRateLimitIp", () => ({
  hashRateLimitIp: mocks.hashRateLimitIp,
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/feedback/createFeedbackSubmission", () => ({
  createFeedbackSubmission:
    mocks.createFeedbackSubmission,
}));

import { POST } from "./route";

const APP_URL = "https://www.veiloraclub.com";

const VALID_MESSAGE =
  "I would love to see more modest workwear collections.";

const PRODUCT_ID =
  "11111111-1111-4111-8111-111111111111";

function makeRequest(
  body: unknown = {
    type: "IDEA",
    message: VALID_MESSAGE,
  },
  options: {
    origin?: string | null;
    contentType?: string | null;
    rawBody?: string;
    contentLength?: string;
  } = {}
): NextRequest {
  const headers = new Headers();

  if (options.origin !== null) {
    headers.set(
      "origin",
      options.origin ?? APP_URL
    );
  }

  if (options.contentType !== null) {
    headers.set(
      "content-type",
      options.contentType ?? "application/json"
    );
  }

  if (options.contentLength !== undefined) {
    headers.set(
      "content-length",
      options.contentLength
    );
  }

  return new NextRequest(
    `${APP_URL}/api/feedback`,
    {
      method: "POST",
      headers,
      body:
        options.rawBody ??
        JSON.stringify(body),
    }
  );
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", APP_URL);

    mocks.getAuthenticatedShopper.mockResolvedValue(null);

    mocks.classifyClientIp.mockReturnValue({
      status: "TRUSTED",
      candidate: "192.0.2.10",
    });

    mocks.hashRateLimitIp.mockReturnValue(
      "test-guest-ip-hash"
    );

    mocks.rateLimit.mockResolvedValue({
      ok: true,
    });

    mocks.createFeedbackSubmission.mockResolvedValue({
      status: "CREATED",
      id: "feedback-1",
      duplicate: false,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fails closed when production site URL is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("fails closed when production site URL is invalid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });
  it("rejects requests without an Origin header", async () => {
    const response = await POST(
      makeRequest(undefined, {
        origin: null,
      })
    );

    expect(response.status).toBe(403);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("rejects requests from another origin", async () => {
    const response = await POST(
      makeRequest(undefined, {
        origin: "https://example.com",
      })
    );

    expect(response.status).toBe(403);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("rejects non-JSON content types", async () => {
    const response = await POST(
      makeRequest(undefined, {
        contentType: "text/plain",
      })
    );

    expect(response.status).toBe(415);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      makeRequest(undefined, {
        rawBody: "{invalid-json",
      })
    );

    expect(response.status).toBe(400);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("rejects invalid feedback fields", async () => {
    const response = await POST(
      makeRequest({
        type: "IDEA",
        message: "Too short",
      })
    );

    expect(response.status).toBe(400);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("rejects declared bodies exceeding 10 KB", async () => {
    const response = await POST(
      makeRequest(undefined, {
        contentLength: "10001",
      })
    );

    expect(response.status).toBe(413);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("rejects actual bodies exceeding 10 KB", async () => {
    const response = await POST(
      makeRequest(undefined, {
        rawBody: JSON.stringify({
          type: "IDEA",
          message: "x".repeat(10001),
        }),
      })
    );

    expect(response.status).toBe(413);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("rejects guests without a trusted IP", async () => {
    mocks.classifyClientIp.mockReturnValue({
      status: "UNTRUSTED",
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("applies the guest attempt limit", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(201);

    expect(mocks.rateLimit).toHaveBeenCalledWith({
      key: "feedback:attempt:guest:test-guest-ip-hash",
      limit: 15,
      windowMs: 60 * 60 * 1000,
    });
  });

  it("rejects guests who exceed the attempt limit", async () => {
    mocks.rateLimit.mockResolvedValue({
      ok: false,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("applies the authenticated shopper attempt limit", async () => {
    mocks.getAuthenticatedShopper.mockResolvedValue({
      id: "shopper-1",
      email: "shopper@example.com",
      firstName: "Test",
      lastName: "Shopper",
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);

    expect(mocks.rateLimit).toHaveBeenCalledWith({
      key: "feedback:attempt:shopper:shopper-1",
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });

    expect(
      mocks.classifyClientIp
    ).not.toHaveBeenCalled();
  });

  it("does not treat an authenticated session as email verification", async () => {
    mocks.getAuthenticatedShopper.mockResolvedValue({
      id: "shopper-1",
      email: "shopper@example.com",
      firstName: "Test",
      lastName: "Shopper",
    });

    await POST(makeRequest());

    expect(
      mocks.createFeedbackSubmission
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        shopperId: "shopper-1",
        contactEmail: "shopper@example.com",
        contactName: "Test Shopper",
        emailVerifiedBySession: false,
      })
    );
  });

  it("rejects product references that are not eligible", async () => {
    mocks.productFindFirst.mockResolvedValue(null);

    const response = await POST(
      makeRequest({
        type: "ISSUE",
        category: "BROKEN_PRODUCT_LINK",
        message: VALID_MESSAGE,
        productId: PRODUCT_ID,
      })
    );

    expect(response.status).toBe(400);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("accepts an eligible product and records its snapshot", async () => {
    mocks.productFindFirst.mockResolvedValue({
      id: PRODUCT_ID,
      title: "Modest Maxi Dress",
      slug: "modest-maxi-dress",
      sourceUrl: "https://brand.example/dress",
      affiliateUrl: null,
      brand: {
        name: "Example Brand",
        slug: "example-brand",
      },
    });

    const response = await POST(
      makeRequest({
        type: "ISSUE",
        category: "BROKEN_PRODUCT_LINK",
        message: VALID_MESSAGE,
        productId: PRODUCT_ID,
      })
    );

    expect(response.status).toBe(201);

    expect(
      mocks.createFeedbackSubmission
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: PRODUCT_ID,
        productTitleSnapshot: "Modest Maxi Dress",
        brandNameSnapshot: "Example Brand",
        productUrlSnapshot:
          "https://brand.example/dress",
      })
    );
  });

  it("rejects page URLs from another website", async () => {
    const response = await POST(
      makeRequest({
        type: "IDEA",
        message: VALID_MESSAGE,
        pageUrl: "https://example.com/private",
      })
    );

    expect(response.status).toBe(400);

    expect(
      mocks.createFeedbackSubmission
    ).not.toHaveBeenCalled();
  });

  it("removes query parameters and fragments from page URLs", async () => {
    const response = await POST(
      makeRequest({
        type: "IDEA",
        message: VALID_MESSAGE,
        pageUrl:
          `${APP_URL}/discover?token=private#section`,
      })
    );

    expect(response.status).toBe(201);

    expect(
      mocks.createFeedbackSubmission
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        pageUrl: `${APP_URL}/discover`,
      })
    );
  });

  it("returns 201 for a newly created submission", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(201);

    expect(await response.json()).toMatchObject({
      ok: true,
      feedbackId: "feedback-1",
      duplicate: false,
    });
  });

  it("returns 200 for duplicate feedback", async () => {
    mocks.createFeedbackSubmission.mockResolvedValue({
      status: "DUPLICATE",
      id: "feedback-1",
      duplicate: true,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(await response.json()).toMatchObject({
      ok: true,
      feedbackId: "feedback-1",
      duplicate: true,
    });
  });

  it("returns 429 with Retry-After when storage limits are reached", async () => {
    mocks.createFeedbackSubmission.mockResolvedValue({
      status: "RATE_LIMITED",
      retryAt: new Date(Date.now() + 60_000),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);

    expect(
      Number(response.headers.get("Retry-After"))
    ).toBeGreaterThan(0);
  });

  it("returns a generic 500 error on submission failure", async () => {
    mocks.createFeedbackSubmission.mockRejectedValue(
      new Error("Sensitive database details")
    );

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await POST(makeRequest());

      expect(response.status).toBe(500);

      const body = await response.json();

      expect(body).toEqual({
        error:
          "Unable to submit feedback. Please try again.",
      });

      expect(JSON.stringify(body)).not.toContain(
        "Sensitive database details"
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});