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
  processOneNewsletterWelcomeEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock(
  "@/lib/marketing/processNewsletterWelcomeEvent",
  () => ({
    processOneNewsletterWelcomeEvent:
      mocks.processOneNewsletterWelcomeEvent,
  })
);

import { GET } from "./route";

function makeRequest(authorization?: string): NextRequest {
  const headers = new Headers();

  if (authorization) {
    headers.set("authorization", authorization);
  }

  return new NextRequest(
    "http://localhost:3000/api/cron/newsletter-welcome",
    {
      method: "GET",
      headers,
    }
  );
}

describe("newsletter welcome cron security", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("NEWSLETTER_WELCOME_WORKER_ENABLED", "false");

    mocks.processOneNewsletterWelcomeEvent.mockResolvedValue({
      status: "EMPTY",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects execution when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const spy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await GET(
        makeRequest("Bearer test-cron-secret")
      );

      expect(response.status).toBe(500);

      expect(
        mocks.processOneNewsletterWelcomeEvent
      ).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects requests without authorisation", async () => {
    const spy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    try {
      const response = await GET(makeRequest());

      expect(response.status).toBe(401);

      expect(
        mocks.processOneNewsletterWelcomeEvent
      ).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects incorrect authorisation", async () => {
    const spy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    try {
      const response = await GET(
        makeRequest("Bearer incorrect-secret")
      );

      expect(response.status).toBe(401);

      expect(
        mocks.processOneNewsletterWelcomeEvent
      ).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("does not process events when disabled", async () => {
    const response = await GET(
      makeRequest("Bearer test-cron-secret")
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.enabled).toBe(false);

    expect(
      mocks.processOneNewsletterWelcomeEvent
    ).not.toHaveBeenCalled();
  });

  it("stops when there are no eligible events", async () => {
    vi.stubEnv("NEWSLETTER_WELCOME_WORKER_ENABLED", "true");

    const spy = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    try {
      const response = await GET(
        makeRequest("Bearer test-cron-secret")
      );

      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.examined).toBe(0);
      expect(body.stopped).toBe(true);

      expect(
        mocks.processOneNewsletterWelcomeEvent
      ).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it("processes no more than five events", async () => {
    vi.stubEnv("NEWSLETTER_WELCOME_WORKER_ENABLED", "true");

    mocks.processOneNewsletterWelcomeEvent.mockResolvedValue({
      status: "SENT",
    });

    const spy = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    try {
      const response = await GET(
        makeRequest("Bearer test-cron-secret")
      );

      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.examined).toBe(5);
      expect(body.sent).toBe(5);

      expect(
        mocks.processOneNewsletterWelcomeEvent
      ).toHaveBeenCalledTimes(5);
    } finally {
      spy.mockRestore();
    }
  });

  it("records cancellation and uncertain outcomes", async () => {
    vi.stubEnv("NEWSLETTER_WELCOME_WORKER_ENABLED", "true");

    mocks.processOneNewsletterWelcomeEvent
      .mockResolvedValueOnce({ status: "CANCELLED" })
      .mockResolvedValueOnce({ status: "UNKNOWN" })
      .mockResolvedValueOnce({ status: "CONFLICT" })
      .mockResolvedValueOnce({ status: "EMPTY" });

    const spy = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    try {
      const response = await GET(
        makeRequest("Bearer test-cron-secret")
      );

      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.cancelled).toBe(1);
      expect(body.unknown).toBe(1);
      expect(body.conflicts).toBe(1);
      expect(body.examined).toBe(3);
    } finally {
      spy.mockRestore();
    }
  });

  it("returns a generic error when processing fails", async () => {
    vi.stubEnv("NEWSLETTER_WELCOME_WORKER_ENABLED", "true");

    mocks.processOneNewsletterWelcomeEvent.mockRejectedValueOnce(
      new Error("Sensitive internal database connection details")
    );

    const spy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await GET(
        makeRequest("Bearer test-cron-secret")
      );

      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.ok).toBe(false);

      expect(
        JSON.stringify(body)
      ).not.toContain("database connection details");
    } finally {
      spy.mockRestore();
    }
  });
});