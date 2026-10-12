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
    adminAuthSession: {
      create: mocks.create,
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      updateMany: mocks.updateMany,
    },
  },
}));

import {
  createAdminSession,
  getAdminSession,
  revokeAdminSession,
  revokeAllAdminSessions,
} from "./adminDbSession";

import { hashSessionToken } from "./sessionCrypto";

const TOKEN = "a".repeat(64);
const ADMIN_ID = "admin-test-123";

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-123",
    adminId: ADMIN_ID,
    expiresAt: new Date("2026-10-11T00:00:00.000Z"),
    lastSeenAt: new Date("2026-10-10T11:58:00.000Z"),
    revokedAt: null,
    ...overrides,
  };
}

describe("adminDbSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a session and stores only its token hash", async () => {
    mocks.create.mockResolvedValue({ id: "session-123" });

    const token = await createAdminSession(ADMIN_ID);

    expect(token).toMatch(/^[a-f0-9]{64}$/);

    expect(mocks.create).toHaveBeenCalledOnce();

    const data = mocks.create.mock.calls[0][0].data;

    expect(data.adminId).toBe(ADMIN_ID);
    expect(data.tokenHash).toBe(hashSessionToken(token));
    expect(data.tokenHash).not.toBe(token);
    expect(data.expiresAt.toISOString()).toBe(
      "2026-10-11T00:00:00.000Z"
    );
  });

  it("rejects malformed tokens without querying the database", async () => {
    expect(await getAdminSession("invalid")).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejects unknown sessions", async () => {
    mocks.findUnique.mockResolvedValue(null);

    expect(await getAdminSession(TOKEN)).toBeNull();
  });

  it("rejects revoked sessions", async () => {
    mocks.findUnique.mockResolvedValue(
      makeSession({ revokedAt: new Date("2026-10-10T11:00:00Z") })
    );

    expect(await getAdminSession(TOKEN)).toBeNull();
  });

  it("rejects sessions at their absolute expiry", async () => {
    mocks.findUnique.mockResolvedValue(
      makeSession({ expiresAt: new Date("2026-10-10T12:00:00Z") })
    );

    expect(await getAdminSession(TOKEN)).toBeNull();
  });

  it("rejects sessions after 30 minutes of inactivity", async () => {
    mocks.findUnique.mockResolvedValue(
      makeSession({ lastSeenAt: new Date("2026-10-10T11:30:00Z") })
    );

    expect(await getAdminSession(TOKEN)).toBeNull();
  });

  it("accepts an active session without updating recent activity", async () => {
    mocks.findUnique.mockResolvedValue(makeSession());
    mocks.findFirst.mockResolvedValue({ id: "session-123" });

    expect(await getAdminSession(TOKEN)).toEqual({
      adminId: ADMIN_ID,
    });

    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("updates activity after five minutes", async () => {
    mocks.findUnique.mockResolvedValue(
      makeSession({ lastSeenAt: new Date("2026-10-10T11:54:00Z") })
    );
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findFirst.mockResolvedValue({ id: "session-123" });

    expect(await getAdminSession(TOKEN)).toEqual({
      adminId: ADMIN_ID,
    });

    expect(mocks.updateMany).toHaveBeenCalledOnce();

    const update = mocks.updateMany.mock.calls[0][0];

    expect(update.where.revokedAt).toBeNull();
    expect(update.data.lastSeenAt.toISOString()).toBe(
      "2026-10-10T12:00:00.000Z"
    );
  });

  it("accepts an active session when another request updated activity first", async () => {
    mocks.findUnique.mockResolvedValue(
      makeSession({ lastSeenAt: new Date("2026-10-10T11:54:00Z") })
    );
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.findFirst.mockResolvedValue({ id: "session-123" });

    expect(await getAdminSession(TOKEN)).toEqual({
      adminId: ADMIN_ID,
    });
  });

  it("rejects a session revoked between lookup and final check", async () => {
    mocks.findUnique.mockResolvedValue(makeSession());
    mocks.findFirst.mockResolvedValue(null);

    expect(await getAdminSession(TOKEN)).toBeNull();
  });

  it("revokes an individual session using its token hash", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });

    await revokeAdminSession(TOKEN);

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

  it("does not query the database when revoking a malformed token", async () => {
    await revokeAdminSession("invalid");

    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("revokes every active session belonging to an administrator", async () => {
    mocks.updateMany.mockResolvedValue({ count: 3 });

    await revokeAllAdminSessions(ADMIN_ID);

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        adminId: ADMIN_ID,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});