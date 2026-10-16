import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/brand/contract/accept", () => {
  it("returns 410 because contract acceptance is handled externally", async () => {
    const response = await POST();

    expect(response.status).toBe(410);

    expect(await response.json()).toEqual({
      ok: false,
      error: "CONTRACT_ACCEPTANCE_DISABLED",
    });
  });

  it("does not expose an acceptance workflow", async () => {
    const response = await POST();

    expect(response.headers.get("location")).toBeNull();
    expect(response.status).not.toBe(200);
    expect(response.status).not.toBe(201);
  });
});