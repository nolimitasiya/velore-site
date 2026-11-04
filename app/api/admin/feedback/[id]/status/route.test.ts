import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: mocks.requireAdminSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feedbackSubmission: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));

import { POST } from "./route";

const SITE_URL = "http://localhost:3000";
const FEEDBACK_ID = "11111111-1111-4111-8111-111111111111";

type RequestOptions = {
  origin?: string | null;
  contentType?: string | null;
  body?: unknown;
  rawBody?: string;
};

function makeRequest(options: RequestOptions = {}): NextRequest {
  const {
    origin = SITE_URL,
    contentType = "application/json",
    body = { status: "IN_PROGRESS" },
    rawBody,
  } = options;

  const headers = new Headers();

  if (origin !== null) {
    headers.set("origin", origin);
  }

  if (contentType !== null) {
    headers.set("content-type", contentType);
  }

  return new Request(
    `${SITE_URL}/api/admin/feedback/${FEEDBACK_ID}/status`,
    {
      method: "POST",
      headers,
      body: rawBody ?? JSON.stringify(body),
    }
  ) as NextRequest;
}

function context(id = FEEDBACK_ID) {
  return {
    params: Promise.resolve({ id }),
  };
}

describe("POST /api/admin/feedback/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);

    mocks.requireAdminSession.mockResolvedValue({ id: "admin-test" });

    mocks.findUnique.mockResolvedValue({
      id: FEEDBACK_ID,
      type: "ISSUE",
    });

    mocks.update.mockImplementation(async ({ data }) => ({
      id: FEEDBACK_ID,
      type: "ISSUE",
      status: data.status,
      updatedAt: new Date("2026-10-27T00:00:00.000Z"),
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 when the production site URL is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(503);
    expect(mocks.requireAdminSession).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 503 when the production site URL is invalid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(503);
    expect(mocks.requireAdminSession).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects requests without an Origin header", async () => {
    const response = await POST(
      makeRequest({ origin: null }),
      context()
    );

    expect(response.status).toBe(403);
    expect(mocks.requireAdminSession).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects requests from an untrusted Origin", async () => {
    const response = await POST(
      makeRequest({ origin: "https://untrusted.example" }),
      context()
    );

    expect(response.status).toBe(403);
    expect(mocks.requireAdminSession).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated administrators", async () => {
    mocks.requireAdminSession.mockRejectedValue(
      new Error("Unauthorized")
    );

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid feedback ID", async () => {
    const response = await POST(
      makeRequest(),
      context("invalid-id")
    );

    expect(response.status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires JSON content type", async () => {
    const response = await POST(
      makeRequest({ contentType: "text/plain" }),
      context()
    );

    expect(response.status).toBe(415);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects a missing status field", async () => {
    const response = await POST(
      makeRequest({ body: {} }),
      context()
    );

    expect(response.status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      makeRequest({ rawBody: "{invalid-json" }),
      context()
    );

    expect(response.status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 404 when feedback does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid Issue status", async () => {
    const response = await POST(
      makeRequest({ body: { status: "IMPLEMENTED" } }),
      context()
    );

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid Idea status", async () => {
    mocks.findUnique.mockResolvedValue({
      id: FEEDBACK_ID,
      type: "IDEA",
    });

    const response = await POST(
      makeRequest({ body: { status: "IN_PROGRESS" } }),
      context()
    );

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates a valid Issue status", async () => {
    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(200);

    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: FEEDBACK_ID },
      data: { status: "IN_PROGRESS" },
      select: {
        id: true,
        type: true,
        status: true,
        updatedAt: true,
      },
    });

    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.feedback.status).toBe("IN_PROGRESS");
  });

  it("updates a valid Idea status", async () => {
    mocks.findUnique.mockResolvedValue({
      id: FEEDBACK_ID,
      type: "IDEA",
    });

    const response = await POST(
      makeRequest({ body: { status: "UNDER_REVIEW" } }),
      context()
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "UNDER_REVIEW" },
      })
    );
  });

  it("returns 500 when the database lookup fails", async () => {
    mocks.findUnique.mockRejectedValue(
      new Error("Simulated database failure")
    );

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(500);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 500 when the database update fails", async () => {
    mocks.update.mockRejectedValue(
      new Error("Simulated database failure")
    );

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(500);
  });
});
