import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cookiesMock,
  getBrandSessionMock,
  findUserMock,
  findMembershipMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getBrandSessionMock: vi.fn(),
  findUserMock: vi.fn(),
  findMembershipMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/auth/brandDbSession", () => ({
  getBrandSession: getBrandSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUserMock,
    },
    brandMembership: {
      findFirst: findMembershipMock,
    },
  },
}));

import {
  requireBrandContext,
  requireBrandSession,
} from "./BrandSession";

const USER_ID = "user-a";
const BRAND_A = "brand-a";
const BRAND_B = "brand-b";
const SESSION_TOKEN = "a".repeat(64);

function mockCookies(
  sessionToken?: string,
  brandId?: string,
) {
  cookiesMock.mockResolvedValue({
    get: vi.fn((name: string) => {
      if (name === "brand_authed" && sessionToken) {
        return { value: sessionToken };
      }

      if (name === "brand_id" && brandId) {
        return { value: brandId };
      }

      return undefined;
    }),
  });
}

describe("BrandSession access control", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockCookies(SESSION_TOKEN, BRAND_A);

    getBrandSessionMock.mockResolvedValue({
      userId: USER_ID,
    });

    findUserMock.mockResolvedValue({
      id: USER_ID,
    });

    findMembershipMock.mockResolvedValue({
      id: "membership-a",
    });
  });

  it("rejects requests without an authentication cookie", async () => {
    mockCookies(undefined, BRAND_A);

    await expect(requireBrandSession()).rejects.toThrow(
      "UNAUTHENTICATED",
    );

    expect(getBrandSessionMock).not.toHaveBeenCalled();
    expect(findMembershipMock).not.toHaveBeenCalled();
  });

  it("rejects invalid or revoked sessions", async () => {
    getBrandSessionMock.mockResolvedValue(null);

    await expect(requireBrandSession()).rejects.toThrow(
      "UNAUTHENTICATED",
    );

    expect(findUserMock).not.toHaveBeenCalled();
  });

  it("rejects sessions whose user no longer exists", async () => {
    findUserMock.mockResolvedValue(null);

    await expect(requireBrandSession()).rejects.toThrow(
      "UNAUTHENTICATED",
    );

    expect(findMembershipMock).not.toHaveBeenCalled();
  });

  it("allows access when the user belongs to the selected brand", async () => {
    await expect(requireBrandContext()).resolves.toEqual({
      userId: USER_ID,
      brandId: BRAND_A,
    });

    expect(findMembershipMock).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        brandId: BRAND_A,
      },
      select: {
        id: true,
      },
    });
  });

  it("rejects a changed brand cookie without matching membership", async () => {
    mockCookies(SESSION_TOKEN, BRAND_B);

    findMembershipMock.mockResolvedValue(null);

    await expect(requireBrandContext()).rejects.toThrow(
      "FORBIDDEN",
    );

    expect(findMembershipMock).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        brandId: BRAND_B,
      },
      select: {
        id: true,
      },
    });
  });

  it("rejects requests without a selected brand", async () => {
    mockCookies(SESSION_TOKEN, undefined);

    await expect(requireBrandContext()).rejects.toThrow(
      "UNAUTHENTICATED",
    );

    expect(findMembershipMock).not.toHaveBeenCalled();
  });
});