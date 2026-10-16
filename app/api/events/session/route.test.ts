import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  getSessionMock,
  attachSessionCookieMock,
  attachAttributionCookieMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  attachSessionCookieMock: vi.fn(),
  attachAttributionCookieMock: vi.fn(),
}));

vi.mock("@/lib/analytics/session", () => ({
  getOrCreateAnalyticsSession: getSessionMock,
  attachAnalyticsSessionCookie: attachSessionCookieMock,
  attachAnalyticsAttributionCookie: attachAttributionCookieMock,
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body: unknown = {}) {
  return new NextRequest(
    "https://example.com/api/events/session",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/events/session", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    getSessionMock.mockResolvedValue({
      sessionId: "session-1",
      isNew: true,
      attribution: null,
      shouldSetAttributionCookie: false,
    });
  });

  it("creates or retrieves a session successfully", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(await response.json()).toEqual({
      ok: true,
      sessionId: "session-1",
      isNew: true,
    });

    expect(attachSessionCookieMock).toHaveBeenCalledOnce();
  });

  it("passes acquisition attribution to the session function", async () => {
    await POST(
      makeRequest({
        utmSource: "instagram",
        utmMedium: "organic_social",
        utmCampaign: "launch",
        landingPath: "/discover",
      }),
    );

    expect(getSessionMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({
        utmSource: "instagram",
        utmMedium: "organic_social",
        utmCampaign: "launch",
        landingPath: "/discover",
      }),
    );
  });

  it("sets the attribution cookie when required", async () => {
    getSessionMock.mockResolvedValue({
      sessionId: "session-1",
      isNew: true,
      attribution: {
        source: "instagram",
        medium: "organic_social",
      },
      shouldSetAttributionCookie: true,
    });

    await POST(makeRequest());

    expect(attachAttributionCookieMock).toHaveBeenCalledOnce();
  });

  it("does not overwrite attribution when it should be preserved", async () => {
    getSessionMock.mockResolvedValue({
      sessionId: "session-1",
      isNew: false,
      attribution: null,
      shouldSetAttributionCookie: false,
    });

    await POST(makeRequest());

    expect(attachAttributionCookieMock).not.toHaveBeenCalled();
  });

  it("returns a non-success payload when session creation fails", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      getSessionMock.mockRejectedValue(
        new Error("Simulated session failure"),
      );

      const response = await POST(makeRequest());

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ok: false,
      });

      expect(attachSessionCookieMock).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});