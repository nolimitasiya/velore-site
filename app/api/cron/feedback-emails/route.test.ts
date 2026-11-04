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
  dispatchFeedbackEmails: vi.fn(),
}));

vi.mock(
  "@/lib/feedback/dispatchFeedbackEmails",
  () => ({
    dispatchFeedbackEmails:
      mocks.dispatchFeedbackEmails,
  })
);

import { GET } from "./route";

function makeRequest(
  authorization?: string
): NextRequest {
  const headers = new Headers();

  if (authorization) {
    headers.set("authorization", authorization);
  }

  return new NextRequest(
    "http://localhost:3000/api/cron/feedback-emails",
    {
      method: "GET",
      headers,
    }
  );
}

describe("feedback email cron security", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.stubEnv("CRON_SECRET", "test-cron-secret");

    vi.stubEnv(
      "FEEDBACK_EMAIL_CRON_ENABLED",
      "true"
    );

    mocks.dispatchFeedbackEmails.mockResolvedValue({
      examined: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
      stale: 0,
      recovered: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects execution when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await GET(
        makeRequest("Bearer test-cron-secret")
      );

      expect(response.status).toBe(500);

      expect(
        mocks.dispatchFeedbackEmails
      ).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("rejects requests without authorisation", async () => {
    const consoleSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    try {
      const response = await GET(makeRequest());

      expect(response.status).toBe(401);

      expect(
        mocks.dispatchFeedbackEmails
      ).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("rejects incorrect authorisation", async () => {
    const consoleSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    try {
      const response = await GET(
        makeRequest("Bearer incorrect-secret")
      );

      expect(response.status).toBe(401);

      expect(
        mocks.dispatchFeedbackEmails
      ).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not dispatch when the feature flag is disabled", async () => {
    vi.stubEnv(
      "FEEDBACK_EMAIL_CRON_ENABLED",
      "false"
    );

    const response = await GET(
      makeRequest("Bearer test-cron-secret")
    );

    const body = await response.json();

    expect(response.status).toBe(200);

    expect(body).toMatchObject({
      ok: true,
      enabled: false,
    });

    expect(
      mocks.dispatchFeedbackEmails
    ).not.toHaveBeenCalled();
  });

  it("dispatches when authorised and explicitly enabled", async () => {
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    try {
      const response = await GET(
        makeRequest("Bearer test-cron-secret")
      );

      const body = await response.json();

      expect(response.status).toBe(200);

      expect(body).toMatchObject({
        ok: true,
        examined: 1,
        sent: 1,
      });

      expect(
        mocks.dispatchFeedbackEmails
      ).toHaveBeenCalledTimes(1);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("returns a generic error when dispatch fails", async () => {
    mocks.dispatchFeedbackEmails.mockRejectedValueOnce(
      new Error("Internal database connection details")
    );

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await GET(
        makeRequest("Bearer test-cron-secret")
      );

      const body = await response.json();

      expect(response.status).toBe(500);

      expect(body).toEqual({
        error: "Feedback email dispatch failed.",
      });

      expect(
        JSON.stringify(body)
      ).not.toContain("database connection details");
    } finally {
      consoleSpy.mockRestore();
    }
  });
});