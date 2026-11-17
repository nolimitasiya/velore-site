import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  getTrustedSiteOrigin: vi.fn(),
  reconcileNewsletterWelcomeEvent: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: mocks.requireAdminSession,
}));

vi.mock("@/lib/config/siteUrl", () => ({
  getTrustedSiteOrigin: mocks.getTrustedSiteOrigin,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/marketing/reconcileNewsletterWelcomeEvent", () => ({
  reconcileNewsletterWelcomeEvent:
    mocks.reconcileNewsletterWelcomeEvent,
}));

import { POST } from "./route";

const TRUSTED_ORIGIN = "https://example.test";

const validBody = {
  eventId: "event-test-1",

  evidenceReference: "Provider investigation reference",
  reason: "Reviewed the provider evidence.",
  providerMessageId: "provider-message-1",
};

function makeRequest(
  body: unknown = validBody,
  options: {
    origin?: string | null;
    contentType?: string | null;
    raw?: string;
  } = {}
): NextRequest {
  const headers = new Headers();

  if (options.origin !== null) {
    headers.set("origin", options.origin ?? TRUSTED_ORIGIN);
  }

  if (options.contentType !== null) {
    headers.set(
      "content-type",
      options.contentType ?? "application/json"
    );
  }

  return new Request(
    `${TRUSTED_ORIGIN}/api/admin/newsletter/welcome/reconcile`,
    {
      method: "POST",
      headers,
      body: options.raw ?? JSON.stringify(body),
    }
  ) as NextRequest;
}

describe("admin newsletter welcome reconciliation endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.getTrustedSiteOrigin.mockReturnValue(TRUSTED_ORIGIN);

    mocks.requireAdminSession.mockResolvedValue({
      adminId: "verified-admin-id",
      admin: {
        id: "verified-admin-id",
        lastSeenWaitlistAt: null,
        lastSeenApplicationsAt: null,
      },
    });

    mocks.reconcileNewsletterWelcomeEvent.mockResolvedValue({
      outcome: "RECONCILED",
      status: "SENT",
    });
  });

  it("rejects an untrusted origin", async () => {
    const response = await POST(
      makeRequest(validBody, {
        origin: "https://attacker.example",
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.requireAdminSession).not.toHaveBeenCalled();
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it("rejects a missing origin", async () => {
    const response = await POST(
      makeRequest(validBody, { origin: null })
    );

    expect(response.status).toBe(403);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it("fails closed when trusted-origin configuration is unavailable", async () => {
    mocks.getTrustedSiteOrigin.mockImplementation(() => {
      throw new Error("Missing site configuration");
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(503);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.requireAdminSession.mockRejectedValue(
      new Error("UNAUTHENTICATED")
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it("rejects non-JSON content types", async () => {
    const response = await POST(
      makeRequest(validBody, { contentType: "text/plain" })
    );

    expect(response.status).toBe(415);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it("rejects oversized requests using Content-Length", async () => {
    const request = makeRequest();

    request.headers.set("content-length", "8193");

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies without Content-Length", async () => {
    const response = await POST(
      makeRequest({
        ...validBody,
        reason: "x".repeat(9000),
      })
    );

    expect(response.status).toBe(413);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON", async () => {
    const response = await POST(
      makeRequest(validBody, { raw: "{invalid-json" })
    );

    expect(response.status).toBe(400);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it.each([
    ["ACCEPTED", { outcome: "ACCEPTED", providerMessageId: "provider-message-1" }],
    ["NOT_ACCEPTED", { outcome: "NOT_ACCEPTED" }],
    ["MATCHED", { outcome: "MATCHED" }],
  ])("rejects administrator-supplied %s evidence", async (_name, evidence) => {
    const response = await POST(
      makeRequest({
        ...validBody,
        evidence,
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it("rejects a forged administrator ID", async () => {
    const response = await POST(
      makeRequest({
        ...validBody,
        adminId: "forged-admin-id",
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it("rejects unexpected request fields", async () => {
    const response = await POST(
      makeRequest({
        ...validBody,
        unexpected: true,
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it.each([
    "",
    " ",
    "provider message with spaces",
    "x".repeat(501),
  ])("rejects invalid provider message ID: %s", async (providerMessageId) => {
    const response = await POST(
      makeRequest({
        ...validBody,
        providerMessageId,
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it("rejects a missing provider message ID", async () => {
    const { providerMessageId: _removed, ...body } = validBody;

    const response = await POST(makeRequest(body));

    expect(response.status).toBe(400);
    expect(mocks.reconcileNewsletterWelcomeEvent).not.toHaveBeenCalled();
  });

  it("returns conflict when the event cannot be reconciled", async () => {
    mocks.reconcileNewsletterWelcomeEvent.mockResolvedValue({
      outcome: "CONFLICT",
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
  });

  it("uses the verified administrator identity for a valid request", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(mocks.reconcileNewsletterWelcomeEvent).toHaveBeenCalledTimes(1);

    expect(mocks.reconcileNewsletterWelcomeEvent).toHaveBeenCalledWith(
      expect.anything(),
      {
        eventId: "event-test-1",
        adminId: "verified-admin-id",
        evidenceReference: "Provider investigation reference",
        reason: "Reviewed the provider evidence.",
        providerMessageId: "provider-message-1",
      }
    );

    expect(await response.json()).toEqual({
      ok: true,
      outcome: "RECONCILED",
      status: "SENT",
    });
  });
});