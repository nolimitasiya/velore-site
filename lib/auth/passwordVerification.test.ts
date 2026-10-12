import { describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("server-only", () => ({}));

import { verifyLoginPassword } from "./passwordVerification";

describe("verifyLoginPassword", () => {
  it("accepts the correct password for an existing account", async () => {
    const hash = await bcrypt.hash("CorrectPassword123!", 4);

    expect(await verifyLoginPassword("CorrectPassword123!", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await bcrypt.hash("CorrectPassword123!", 4);

    expect(await verifyLoginPassword("WrongPassword123!", hash)).toBe(false);
  });

  it("rejects an unknown account", async () => {
    expect(await verifyLoginPassword("AnyPassword123!", null)).toBe(false);
  });

  it("rejects an undefined stored password", async () => {
    expect(await verifyLoginPassword("AnyPassword123!", undefined)).toBe(false);
  });

  it("rejects an empty stored password", async () => {
    expect(await verifyLoginPassword("AnyPassword123!", "")).toBe(false);
  });

  it("uses a real bcrypt hash for nonexistent accounts", async () => {
    const compareSpy = vi.spyOn(bcrypt, "compare");

    try {
      await verifyLoginPassword("AnyPassword123!", null);

      expect(compareSpy).toHaveBeenCalled();

      const hash = compareSpy.mock.calls[0]?.[1];

      expect(typeof hash).toBe("string");
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    } finally {
      compareSpy.mockRestore();
    }
  });
});
