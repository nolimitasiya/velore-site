import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: vi.fn(),
}));

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { withAdminAuth } from "./withAdminAuth";

const mockedRequireAdminSession = vi.mocked(
  requireAdminSession
);

describe("withAdminAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without an admin session", async () => {
    mockedRequireAdminSession.mockRejectedValue(
      new Error("UNAUTHENTICATED")
    );

    const handler = vi.fn(async () => {
      return Response.json({ ok: true });
    });

    const protectedHandler = withAdminAuth(handler);

    const response = await protectedHandler();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Unauthorized",
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects invalid admin sessions", async () => {
    mockedRequireAdminSession.mockRejectedValue(
      new Error("INVALID_SESSION")
    );

    const handler = vi.fn(async () => {
      return Response.json({ ok: true });
    });

    const protectedHandler = withAdminAuth(handler);

    const response = await protectedHandler();

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("allows valid admin sessions", async () => {
    mockedRequireAdminSession.mockResolvedValue(
      {} as Awaited<ReturnType<typeof requireAdminSession>>
    );

    const handler = vi.fn(async () => {
      return Response.json({ ok: true });
    });

    const protectedHandler = withAdminAuth(handler);

    const response = await protectedHandler();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it("preserves request arguments", async () => {
    mockedRequireAdminSession.mockResolvedValue(
      {} as Awaited<ReturnType<typeof requireAdminSession>>
    );

    const request = new Request(
      "http://localhost:3000/api/admin/test"
    );

    const context = {
      params: Promise.resolve({ id: "123" }),
    };

    const handler = vi.fn(
      async (req: Request, ctx: typeof context) => {
        const { id } = await ctx.params;

        return Response.json({
          url: req.url,
          id,
        });
      }
    );

    const protectedHandler = withAdminAuth(handler);

    const response = await protectedHandler(
      request,
      context
    );

    expect(response.status).toBe(200);

    expect(await response.json()).toEqual({
      url: request.url,
      id: "123",
    });

    expect(handler).toHaveBeenCalledWith(
      request,
      context
    );
  });

  it("prevents protected operations when authentication fails", async () => {
    mockedRequireAdminSession.mockRejectedValue(
      new Error("UNAUTHENTICATED")
    );

    const databaseUpdate = vi.fn();
    const sendKlaviyoEvent = vi.fn();

    const handler = vi.fn(async () => {
      await databaseUpdate();
      await sendKlaviyoEvent();

      return Response.json({ ok: true });
    });

    const protectedHandler = withAdminAuth(handler);

    const response = await protectedHandler();

    expect(response.status).toBe(401);

    expect(handler).not.toHaveBeenCalled();
    expect(databaseUpdate).not.toHaveBeenCalled();
    expect(sendKlaviyoEvent).not.toHaveBeenCalled();
  });
});