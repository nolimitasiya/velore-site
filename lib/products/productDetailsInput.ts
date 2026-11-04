export type ProductSpecificationInput = {
  label: string;
  value: string;
  sortOrder: number;
};

export type ProductDetailsInput = {
  description?: string | null;
  colourDescription?: string | null;
  careInstructions?: string | null;
  countryOfOrigin?: string | null;
  transparency?: string | null;
  liningStatus?: string | null;
  specifications?: ProductSpecificationInput[];
};

const PRODUCT_DETAIL_FIELDS = [
  "description",
  "colourDescription",
  "careInstructions",
  "countryOfOrigin",
  "transparency",
  "liningStatus",
] as const;

type ProductDetailField = (typeof PRODUCT_DETAIL_FIELDS)[number];

const MAX_FIELD_LENGTHS: Record<ProductDetailField, number> = {
  description: 10000,
  colourDescription: 500,
  careInstructions: 5000,
  countryOfOrigin: 250,
  transparency: 250,
  liningStatus: 250,
};

const MAX_SPECIFICATIONS = 50;
const MAX_SPECIFICATION_LABEL_LENGTH = 150;
const MAX_SPECIFICATION_VALUE_LENGTH = 5000;

export class ProductDetailsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductDetailsValidationError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function normaliseOptionalText(
  value: unknown,
  field: ProductDetailField
): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ProductDetailsValidationError(
      `${field} must be a string or null.`
    );
  }

  const trimmed = value.trim();

  if (trimmed.length > MAX_FIELD_LENGTHS[field]) {
    throw new ProductDetailsValidationError(
      `${field} exceeds the maximum permitted length.`
    );
  }

  return trimmed || null;
}

function parseSpecifications(
  value: unknown
): ProductSpecificationInput[] {
  if (!Array.isArray(value)) {
    throw new ProductDetailsValidationError(
      "Specifications must be an array."
    );
  }

  if (value.length > MAX_SPECIFICATIONS) {
    throw new ProductDetailsValidationError(
      `A product can have at most ${MAX_SPECIFICATIONS} specifications.`
    );
  }

  const specifications: ProductSpecificationInput[] = [];
  const usedLabels = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];

    if (!isPlainObject(item)) {
      throw new ProductDetailsValidationError(
        `Specification ${index + 1} must be an object.`
      );
    }

    if (
      typeof item.label !== "string" ||
      typeof item.value !== "string"
    ) {
      throw new ProductDetailsValidationError(
        `Specification ${index + 1} requires a label and value.`
      );
    }

    const label = item.label.trim();
    const specificationValue = item.value.trim();

    if (!label || !specificationValue) {
      throw new ProductDetailsValidationError(
        `Specification ${index + 1} cannot have an empty label or value.`
      );
    }

    if (label.length > MAX_SPECIFICATION_LABEL_LENGTH) {
      throw new ProductDetailsValidationError(
        `Specification ${index + 1} has a label that is too long.`
      );
    }

    if (specificationValue.length > MAX_SPECIFICATION_VALUE_LENGTH) {
      throw new ProductDetailsValidationError(
        `Specification ${index + 1} has a value that is too long.`
      );
    }

    const normalisedLabel = label.toLocaleLowerCase("en");

    if (usedLabels.has(normalisedLabel)) {
      throw new ProductDetailsValidationError(
        `Duplicate specification label: ${label}.`
      );
    }

    usedLabels.add(normalisedLabel);

    specifications.push({
      label,
      value: specificationValue,
      sortOrder: index,
    });
  }

  return specifications;
}

/**
 * Parses optional Product Details fields.
 *
 * Omitted properties are not returned.
 * Explicit null or empty strings clear text fields.
 * An explicit empty specifications array clears specifications.
 *
 * The caller must preserve omitted fields during PATCH updates.
 */
export function parseProductDetailsInput(
  input: unknown
): ProductDetailsInput {
  if (!isPlainObject(input)) {
    throw new ProductDetailsValidationError(
      "Product Details must be an object."
    );
  }

  const result: ProductDetailsInput = {};

  for (const field of PRODUCT_DETAIL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      result[field] = normaliseOptionalText(input[field], field);
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "specifications")) {
    result.specifications = parseSpecifications(input.specifications);
  }

  return result;
}