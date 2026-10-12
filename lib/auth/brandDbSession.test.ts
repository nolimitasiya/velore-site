import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brandAuthSession: {
      create: mocks.create,
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      updateMany: mocks.updateMany,
    },
  },
}));

import {
  createBrandSession,
  getBrandSession,
  revokeBrandSession,
  revokeAllBrandSessions,
} from "./brandDbSession";

import { hashSessionToken } from "./sessionCrypto";

const TOKEN = "b".repeat(64);
const USER_ID = "123e4567-e89b-42d3-a456-426614174000";

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "brand-session-123",
    userId: USER_ID,
    expiresAt: new Date("2026-10-11T00:00:00.000Z"),
    lastSeenAt: new Date("2026-10-10T11:58:00.000Z"),
    revokedAt: null,
    ...overrides,
  };
}

describe("brandDbSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a session and stores only its token hash", async () => {
    mocks.create.mockResolvedValue({ id: "brand-session-123" });

    const token = await createBrandSession(USER_ID);

    expect(token).toMatch(/^[a-f0-9]{64}$/);

    const data = mocks.create.mock.calls[0][0].data;

    expect(data.userId).toBe(USER_ID);
    expect(data.tokenHash).toBe(hashSessionToken(token));
    expect(data.tokenHash).not.toBe(token);
    expect(data.expiresAt.toISOString()).toBe(
      "2026-10-11T00:00:00.000Z"
    );
  });

  it("rejects malformed tokens", async () => {
    expect(await getBrandSession("invalid")).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejects unknown sessions", async () => {
    mocks.findUnique.mockResolvedValue(null);

    expect(await getBrandSession(TOKEN)).toBeNull();
  });

  it("rejects revoked sessions", async () => {
    mocks.findUnique.mockResolvedValue(
      makeSession({ revokedAt: new Date("2026-10-10T11:00:00Z") })
    );

    expect(await getBrandSession(TOKEN)).toBeNull();
  });

  it("rejects sessions at their absolute expiry", async () => {
    mocks.findUnique.mockResolvedValue(
      makeSession({ expiresAt: new Date("2026-10-10T12:00:00Z") })
    );

    expect(await getBrandSession(TOKEN)).toBeNull();
  });

  it("rejects sessions after two hours of inactivity", async () => {
    mocks.findUnique.mockResolvedValue(
      makeSession({ lastSeenAt: new Date("2026-10-10T10:00:00Z") })
    );

    expect(await getBrandSession(TOKEN)).toBeNull();
  });

  it("accepts an active session without refreshing recent activity", async () => {
    mocks.findUnique.mockResolvedValue(makeSession());
    mocks.findFirst.mockResolvedValue({ id: "brand-session-123" });

    expect(await getBrandSession(TOKEN)).toEqual({
      userId: USER_ID,
    });

    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("refreshes activity after five minutes", async () => {
    mocks.findUnique.mockResolvedValue(
      makeSession({ lastSeenAt: new Date("2026-10-10T11:54:00Z") })
    );
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findFirst.mockResolvedValue({ id: "brand-session-123" });

    expect(await getBrandSession(TOKEN)).toEqual({
      userId: USER_ID,
    });

    expect(mocks.updateMany).toHaveBeenCalledOnce();

    const update = mocks.updateMany.mock.calls[0][0];

    expect(update.where.revokedAt).toBeNull();
    expect(update.data.lastSeenAt.toISOString()).toBe(
      "2026-10-10T12:00:00.000Z"
    );
  });

  it("accepts a session if another request refreshed activity first", async () => {
    mocks.findUnique.mockResolvedValue(
      makeSession({ lastSeenAt: new Date("2026-10-10T11:54:00Z") })
    );
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.findFirst.mockResolvedValue({ id: "brand-session-123" });

    expect(await getBrandSession(TOKEN)).toEqual({
      userId: USER_ID,
    });
  });

  it("rejects a session revoked between lookup and final check", async () => {
    mocks.findUnique.mockResolvedValue(makeSession());
    mocks.findFirst.mockResolvedValue(null);

    expect(await getBrandSession(TOKEN)).toBeNull();
  });

  it("revokes one session by its token hash", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });

    await revokeBrandSession(TOKEN);

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: hashSessionToken(TOKEN),
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it("ignores malformed tokens during revocation", async () => {
    await revokeBrandSession("invalid");

    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("revokes every active session belonging to a brand user", async () => {
    mocks.updateMany.mockResolvedValue({ count: 3 });

    await revokeAllBrandSessions(USER_ID);

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});