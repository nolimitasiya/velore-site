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
  dispatchShopperWelcomeEmails: vi.fn(),
  countStuckShopperWelcomeEmails: vi.fn(),
}));

vi.mock(
  "@/lib/feedback/dispatchFeedbackEmails",
  () => ({
    dispatchFeedbackEmails:
      mocks.dispatchFeedbackEmails,
  })
);

vi.mock(
  "@/lib/email/dispatchShopperWelcomeEmails",
  () => ({
    dispatchShopperWelcomeEmails:
      mocks.dispatchShopperWelcomeEmails,
  })
);

vi.mock(
  "@/lib/email/countStuckShopperWelcomeEmails",
  () => ({
    countStuckShopperWelcomeEmails:
      mocks.countStuckShopperWelcomeEmails,
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

    vi.stubEnv(
      "SHOPPER_WELCOME_EMAIL_CRON_ENABLED",
      "false"
    );

    mocks.dispatchShopperWelcomeEmails.mockResolvedValue({
      examined: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });

    mocks.countStuckShopperWelcomeEmails.mockResolvedValue(0);

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
        feedbackEnabled: true,
        welcomeEnabled: false,
        feedback: {
          examined: 1,
          sent: 1,
        },
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

      expect(body).toMatchObject({
        ok: false,
        feedbackEnabled: true,
        welcomeEnabled: false,
      });

      expect(
        JSON.stringify(body)
      ).not.toContain("database connection details");
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("runs welcome emails independently of feedback", async () => {
    vi.stubEnv("FEEDBACK_EMAIL_CRON_ENABLED", "false");
    vi.stubEnv("SHOPPER_WELCOME_EMAIL_CRON_ENABLED", "true");

    const response = await GET(
      makeRequest("Bearer test-cron-secret")
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.welcomeEnabled).toBe(true);
    expect(body.feedbackEnabled).toBe(false);

    expect(
      mocks.dispatchShopperWelcomeEmails
    ).toHaveBeenCalledTimes(1);

    expect(
      mocks.dispatchFeedbackEmails
    ).not.toHaveBeenCalled();
  });

  it("runs both dispatchers when both are enabled", async () => {
    vi.stubEnv("SHOPPER_WELCOME_EMAIL_CRON_ENABLED", "true");

    const response = await GET(
      makeRequest("Bearer test-cron-secret")
    );

    expect(response.status).toBe(200);

    expect(
      mocks.dispatchFeedbackEmails
    ).toHaveBeenCalledTimes(1);

    expect(
      mocks.dispatchShopperWelcomeEmails
    ).toHaveBeenCalledTimes(1);
  });

  it("continues welcome processing when feedback fails", async () => {
    vi.stubEnv("SHOPPER_WELCOME_EMAIL_CRON_ENABLED", "true");

    mocks.dispatchFeedbackEmails.mockRejectedValueOnce(
      new Error("Simulated feedback failure")
    );

    const response = await GET(
      makeRequest("Bearer test-cron-secret")
    );

    expect(response.status).toBe(500);

    expect(
      mocks.dispatchShopperWelcomeEmails
    ).toHaveBeenCalledTimes(1);
  });

  it("continues feedback processing when welcome fails", async () => {
    vi.stubEnv("SHOPPER_WELCOME_EMAIL_CRON_ENABLED", "true");

    mocks.dispatchShopperWelcomeEmails.mockRejectedValueOnce(
      new Error("Simulated welcome failure")
    );

    const response = await GET(
      makeRequest("Bearer test-cron-secret")
    );

    expect(response.status).toBe(500);

    expect(
      mocks.dispatchFeedbackEmails
    ).toHaveBeenCalledTimes(1);
  });

  it("never dispatches welcome emails without authorisation", async () => {
    vi.stubEnv("SHOPPER_WELCOME_EMAIL_CRON_ENABLED", "true");

    const response = await GET(
      makeRequest("Bearer incorrect-secret")
    );

    expect(response.status).toBe(401);

    expect(
      mocks.dispatchShopperWelcomeEmails
    ).not.toHaveBeenCalled();
  });

  it("monitors stuck claims when welcome emails are enabled", async () => {
    vi.stubEnv("FEEDBACK_EMAIL_CRON_ENABLED", "false");
    vi.stubEnv("SHOPPER_WELCOME_EMAIL_CRON_ENABLED", "true");

    mocks.countStuckShopperWelcomeEmails.mockResolvedValue(2);

    const response = await GET(
      makeRequest("Bearer test-cron-secret")
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.welcomeStuckClaims).toBe(2);

    expect(
      mocks.countStuckShopperWelcomeEmails
    ).toHaveBeenCalledTimes(1);
  });

  it("does not monitor when welcome emails are disabled", async () => {
    vi.stubEnv("SHOPPER_WELCOME_EMAIL_CRON_ENABLED", "false");

    const response = await GET(
      makeRequest("Bearer test-cron-secret")
    );

    expect(response.status).toBe(200);

    expect(
      mocks.countStuckShopperWelcomeEmails
    ).not.toHaveBeenCalled();
  });

  it("reports monitoring failure without exposing internal details", async () => {
    vi.stubEnv("SHOPPER_WELCOME_EMAIL_CRON_ENABLED", "true");

    mocks.countStuckShopperWelcomeEmails.mockRejectedValue(
      new Error("Sensitive internal database information")
    );

    const response = await GET(
      makeRequest("Bearer test-cron-secret")
    );

    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.ok).toBe(false);

    expect(
      JSON.stringify(body)
    ).not.toContain("Sensitive internal database information");
  });
});