import { describe, expect, it } from "vitest";

import {
  parseProductDetailsInput,
  ProductDetailsValidationError,
} from "./productDetailsInput";

describe("Product Details input validation", () => {
  it("accepts an empty object", () => {
    expect(parseProductDetailsInput({})).toEqual({});
  });

  it("accepts valid descriptive fields", () => {
    expect(
      parseProductDetailsInput({
        description: "  Elegant maxi dress  ",
        colourDescription: "  Soft ivory  ",
        careInstructions: "  Hand wash only  ",
        countryOfOrigin: "  Türkiye  ",
        transparency: "  Opaque  ",
        liningStatus: "  Fully lined  ",
      })
    ).toEqual({
      description: "Elegant maxi dress",
      colourDescription: "Soft ivory",
      careInstructions: "Hand wash only",
      countryOfOrigin: "Türkiye",
      transparency: "Opaque",
      liningStatus: "Fully lined",
    });
  });

  it("converts empty text fields to null", () => {
    expect(
      parseProductDetailsInput({
        description: "   ",
        careInstructions: "",
      })
    ).toEqual({
      description: null,
      careInstructions: null,
    });
  });

  it("preserves explicitly null fields", () => {
    expect(
      parseProductDetailsInput({
        description: null,
      })
    ).toEqual({
      description: null,
    });
  });

  it("rejects invalid descriptive field types", () => {
    expect(() =>
      parseProductDetailsInput({
        description: 123,
      })
    ).toThrow(ProductDetailsValidationError);
  });

  it.each([
    ["description", 10000],
    ["colourDescription", 500],
    ["careInstructions", 5000],
    ["countryOfOrigin", 250],
    ["transparency", 250],
    ["liningStatus", 250],
  ])("enforces the %s length limit", (field, maximum) => {
    expect(() =>
      parseProductDetailsInput({
        [field]: "a".repeat(maximum),
      })
    ).not.toThrow();

    expect(() =>
      parseProductDetailsInput({
        [field]: "a".repeat(maximum + 1),
      })
    ).toThrow(ProductDetailsValidationError);
  });

  it("accepts valid specifications and assigns ordering", () => {
    expect(
      parseProductDetailsInput({
        specifications: [
          {
            label: " Material ",
            value: " Cotton ",
            sortOrder: 999,
          },
          {
            label: " Lining ",
            value: " Viscose ",
          },
        ],
      })
    ).toEqual({
      specifications: [
        {
          label: "Material",
          value: "Cotton",
          sortOrder: 0,
        },
        {
          label: "Lining",
          value: "Viscose",
          sortOrder: 1,
        },
      ],
    });
  });

  it("accepts an empty specifications array", () => {
    expect(
      parseProductDetailsInput({
        specifications: [],
      })
    ).toEqual({
      specifications: [],
    });
  });

  it("rejects specifications that are not an array", () => {
    expect(() =>
      parseProductDetailsInput({
        specifications: "Material: Cotton",
      })
    ).toThrow(ProductDetailsValidationError);
  });

  it("rejects more than 50 specifications", () => {
    expect(() =>
      parseProductDetailsInput({
        specifications: Array.from(
          { length: 51 },
          (_, index) => ({
            label: `Material ${index}`,
            value: "Cotton",
          })
        ),
      })
    ).toThrow(ProductDetailsValidationError);
  });

  it("accepts exactly 50 specifications", () => {
    expect(
      parseProductDetailsInput({
        specifications: Array.from(
          { length: 50 },
          (_, index) => ({
            label: `Material ${index}`,
            value: "Cotton",
          })
        ),
      }).specifications
    ).toHaveLength(50);
  });

  it("rejects incomplete specification rows", () => {
    expect(() =>
      parseProductDetailsInput({
        specifications: [
          {
            label: "Material",
            value: "",
          },
        ],
      })
    ).toThrow(ProductDetailsValidationError);
  });

  it("rejects duplicate labels regardless of case", () => {
    expect(() =>
      parseProductDetailsInput({
        specifications: [
          {
            label: "Material",
            value: "Cotton",
          },
          {
            label: "material",
            value: "Linen",
          },
        ],
      })
    ).toThrow(ProductDetailsValidationError);
  });

  it("rejects oversized specification labels", () => {
    expect(() =>
      parseProductDetailsInput({
        specifications: [
          {
            label: "a".repeat(151),
            value: "Cotton",
          },
        ],
      })
    ).toThrow(ProductDetailsValidationError);
  });

  it("rejects oversized specification values", () => {
    expect(() =>
      parseProductDetailsInput({
        specifications: [
          {
            label: "Material",
            value: "a".repeat(5001),
          },
        ],
      })
    ).toThrow(ProductDetailsValidationError);
  });

  it("rejects invalid specification objects", () => {
    expect(() =>
      parseProductDetailsInput({
        specifications: [null],
      })
    ).toThrow(ProductDetailsValidationError);
  });

  it("rejects invalid top-level input", () => {
    expect(() =>
      parseProductDetailsInput(null)
    ).toThrow(ProductDetailsValidationError);
  });
});