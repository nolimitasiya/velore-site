import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  transactionMock,
  queryRawMock,
  findUniqueMock,
  createMock,
  updateMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  queryRawMock: vi.fn(),
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

import { rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    queryRawMock.mockResolvedValue(1);

    transactionMock.mockImplementation(async (callback) =>
      callback({
        $queryRaw: queryRawMock,
        rateLimit: {
          findUnique: findUniqueMock,
          create: createMock,
          update: updateMock,
        },
      }),
    );
  });

  it("counts the first request as one attempt", async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({});

    const result = await rateLimit({
      key: "test:first",
      limit: 5,
      windowMs: 60_000,
    });

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeInstanceOf(Date);

    expect(createMock).toHaveBeenCalledWith({
      data: {
        key: "test:first",
        count: 1,
        resetAt: expect.any(Date),
      },
    });

    expect(updateMock).not.toHaveBeenCalled();
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("increments an existing counter", async () => {
    const resetAt = new Date(Date.now() + 60_000);

    findUniqueMock.mockResolvedValue({
      count: 2,
      resetAt,
    });

    updateMock.mockResolvedValue({
      count: 3,
      resetAt,
    });

    const result = await rateLimit({
      key: "test:existing",
      limit: 5,
      windowMs: 60_000,
    });

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(2);

    expect(updateMock).toHaveBeenCalledWith({
      where: { key: "test:existing" },
      data: {
        count: { increment: 1 },
      },
      select: {
        count: true,
        resetAt: true,
      },
    });
  });

  it("rejects requests exceeding the limit", async () => {
    const resetAt = new Date(Date.now() + 60_000);

    findUniqueMock.mockResolvedValue({
      count: 5,
      resetAt,
    });

    updateMock.mockResolvedValue({
      count: 6,
      resetAt,
    });

    const result = await rateLimit({
      key: "test:blocked",
      limit: 5,
      windowMs: 60_000,
    });

    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toEqual(resetAt);
  });

  it("resets an expired window", async () => {
    findUniqueMock.mockResolvedValue({
      count: 10,
      resetAt: new Date(Date.now() - 60_000),
    });

    updateMock.mockResolvedValue({});

    const result = await rateLimit({
      key: "test:expired",
      limit: 5,
      windowMs: 60_000,
    });

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(4);

    expect(updateMock).toHaveBeenCalledWith({
      where: { key: "test:expired" },
      data: {
        count: 1,
        resetAt: expect.any(Date),
      },
    });
  });

  it("rejects invalid configuration", async () => {
    await expect(
      rateLimit({
        key: "",
        limit: 5,
        windowMs: 60_000,
      }),
    ).rejects.toThrow("Invalid rate limit configuration");

    await expect(
      rateLimit({
        key: "test:invalid",
        limit: 0,
        windowMs: 60_000,
      }),
    ).rejects.toThrow("Invalid rate limit configuration");

    await expect(
      rateLimit({
        key: "test:invalid",
        limit: 5,
        windowMs: 0,
      }),
    ).rejects.toThrow("Invalid rate limit configuration");

    expect(transactionMock).not.toHaveBeenCalled();
  });
  it("does not increment counters after the limit has been exceeded", async () => {
    const resetAt = new Date(Date.now() + 60_000);

    findUniqueMock.mockResolvedValue({
      count: 6,
      resetAt,
    });

    const result = await rateLimit({
      key: "test:already-blocked",
      limit: 5,
      windowMs: 60_000,
    });

    expect(result).toEqual({
      ok: false,
      remaining: 0,
      resetAt,
    });

    expect(updateMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();

    // The advisory lock is still acquired.
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });
});
