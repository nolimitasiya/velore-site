import { describe, expect, it } from "vitest";

import { getLengthMeasurementSemantic } from "@/lib/fit/lengthMeasurementSemantic";

describe("getLengthMeasurementSemantic", () => {
  it("presents inseam semantics", () => {
    expect(getLengthMeasurementSemantic("INSEAM")).toEqual({
      shopperLabel: "Your inseam",
      garmentLabel: "Inseam",
      shopperReferencePhrase: "your inseam",
      matchPhrase: "matches your inseam",
    });
  });

  it("presents preferred skirt-length semantics", () => {
    expect(
      getLengthMeasurementSemantic("SKIRT_LENGTH")
    ).toEqual({
      shopperLabel: "Your preferred skirt length",
      garmentLabel: "Skirt length",
      shopperReferencePhrase:
        "your preferred skirt length",
      matchPhrase:
        "matches your preferred skirt length",
    });
  });

  it("keeps maxi-length semantics distinct from skirt length", () => {
    expect(
      getLengthMeasurementSemantic("GARMENT_LENGTH")
    ).toEqual({
      shopperLabel: "Your preferred length",
      garmentLabel: "Garment length",
      shopperReferencePhrase:
        "your preferred length",
      matchPhrase:
        "matches your preferred maxi length",
    });
  });

  it("fails safely to generic length wording for an unknown measurement type", () => {
    expect(
      getLengthMeasurementSemantic("UNKNOWN_LENGTH")
    ).toEqual({
      shopperLabel: "Your preferred measurement",
      garmentLabel: "Length",
      shopperReferencePhrase:
        "your preferred measurement",
      matchPhrase:
        "matches your preferred measurement",
    });
  });
});