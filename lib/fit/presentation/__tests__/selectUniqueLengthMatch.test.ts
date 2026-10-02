import {
  describe,
  expect,
  it,
} from "vitest";

import {
  selectUniqueLengthMatch,
} from "@/lib/fit/presentation/selectUniqueLengthMatch";

describe("selectUniqueLengthMatch", () => {
  it("returns the only exact match", () => {
    const result = selectUniqueLengthMatch([
      {
        id: "54",
        status: "SHORTER" as const,
      },
      {
        id: "58",
        status: "MATCH" as const,
      },
      {
        id: "60",
        status: "LONGER" as const,
      },
    ]);

    expect(result?.id).toBe("58");
  });

  it("returns null when there is no exact match", () => {
    const result = selectUniqueLengthMatch([
      {
        id: "54",
        status: "SHORTER" as const,
      },
      {
        id: "56",
        status: "SHORTER" as const,
      },
      {
        id: "60",
        status: "LONGER" as const,
      },
    ]);

    expect(result).toBeNull();
  });

  it("returns null when multiple options match", () => {
    const result = selectUniqueLengthMatch([
      {
        id: "58-a",
        status: "MATCH" as const,
      },
      {
        id: "58-b",
        status: "MATCH" as const,
      },
    ]);

    expect(result).toBeNull();
  });

  it("returns null for an empty candidate set", () => {
    expect(
      selectUniqueLengthMatch([])
    ).toBeNull();
  });
});