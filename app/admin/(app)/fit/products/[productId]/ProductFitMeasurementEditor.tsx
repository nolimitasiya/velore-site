"use client";

import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  FitUnit,
  ProductType,
} from "@prisma/client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InitialMeasurement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
  sourceMinValue: string;
  sourceMaxValue: string;
  sourceUnit: FitUnit;
};

type InitialSizeMeasurement = InitialMeasurement & {
  sizeId: string;
  measurementBasis: FitMeasurementBasis | null;
};

type ProductSize = {
  sizeId: string;
  sizeName: string;
};

type Props = {
  productId: string;
  productTypes: ProductType[];
  productSizes: ProductSize[];
  initialMeasurements: InitialMeasurement[];
  initialSizeMeasurements: InitialSizeMeasurement[];
};

type ProductRow = {
  key: string;
  type: FitMeasurementType;
  component: FitGarmentComponent;
  sourceMinValue: string;
  sourceMaxValue: string;
  sourceUnit: FitUnit;
};

type SizeRow = {
  key: string;
  type: FitMeasurementType;
  component: FitGarmentComponent;
  measurementBasis: FitMeasurementBasis | null;
  sourceUnit: FitUnit;
  values: Record<
    string,
    {
      min: string;
      max: string;
    }
  >;
};

const PRODUCT_TYPE_MEASUREMENTS: Partial<
  Record<ProductType, FitMeasurementType[]>
> = {
  ABAYA: [
    FitMeasurementType.BUST,
    FitMeasurementType.SHOULDER_WIDTH,
    FitMeasurementType.SLEEVE_LENGTH,
    FitMeasurementType.GARMENT_LENGTH,
  ],

  DRESS: [
    FitMeasurementType.BUST,
    FitMeasurementType.WAIST,
    FitMeasurementType.HIP,
    FitMeasurementType.SHOULDER_WIDTH,
    FitMeasurementType.SLEEVE_LENGTH,
    FitMeasurementType.GARMENT_LENGTH,
  ],

  SKIRT: [
    FitMeasurementType.WAIST,
    FitMeasurementType.HIP,
    FitMeasurementType.SKIRT_LENGTH,
    FitMeasurementType.FRONT_LENGTH,
    FitMeasurementType.BACK_LENGTH,
  ],

  TOP: [
    FitMeasurementType.BUST,
    FitMeasurementType.SHOULDER_WIDTH,
    FitMeasurementType.SLEEVE_LENGTH,
    FitMeasurementType.TOP_LENGTH,
  ],

  T_SHIRT: [
    FitMeasurementType.BUST,
    FitMeasurementType.SHOULDER_WIDTH,
    FitMeasurementType.SLEEVE_LENGTH,
    FitMeasurementType.TOP_LENGTH,
  ],

  PANTS: [
    FitMeasurementType.WAIST,
    FitMeasurementType.HIP,
    FitMeasurementType.INSEAM,
    FitMeasurementType.TROUSER_LENGTH,
  ],

  BLAZER: [
    FitMeasurementType.BUST,
    FitMeasurementType.SHOULDER_WIDTH,
    FitMeasurementType.SLEEVE_LENGTH,
    FitMeasurementType.GARMENT_LENGTH,
  ],

  COATS_JACKETS: [
    FitMeasurementType.BUST,
    FitMeasurementType.SHOULDER_WIDTH,
    FitMeasurementType.SLEEVE_LENGTH,
    FitMeasurementType.GARMENT_LENGTH,
  ],

  HIJAB: [
    FitMeasurementType.GARMENT_LENGTH,
    FitMeasurementType.WIDTH,
  ],

  KHIMAR: [
    FitMeasurementType.FRONT_LENGTH,
    FitMeasurementType.BACK_LENGTH,
    FitMeasurementType.WIDTH,
    FitMeasurementType.NECK_OPENING,
  ],

  JILBAB: [
    FitMeasurementType.BUST,
    FitMeasurementType.SLEEVE_LENGTH,
    FitMeasurementType.GARMENT_LENGTH,
    FitMeasurementType.WIDTH,
  ],
};

const COMPONENT_BY_PRODUCT_TYPE: Partial<
  Record<ProductType, FitGarmentComponent>
> = {
  ABAYA: FitGarmentComponent.ABAYA,
  DRESS: FitGarmentComponent.DRESS,
  SKIRT: FitGarmentComponent.SKIRT,
  TOP: FitGarmentComponent.TOP,
  T_SHIRT: FitGarmentComponent.TOP,
  PANTS: FitGarmentComponent.TROUSER,
  BLAZER: FitGarmentComponent.JACKET,
  COATS_JACKETS: FitGarmentComponent.JACKET,
  HIJAB: FitGarmentComponent.HIJAB,
  KHIMAR: FitGarmentComponent.KHIMAR,
  JILBAB: FitGarmentComponent.JILBAB,
};

const ONE_SIZE_DEFAULT_DIMENSIONS = {
  [ProductType.HIJAB]: [
    FitMeasurementType.GARMENT_LENGTH,
    FitMeasurementType.WIDTH,
  ],

  [ProductType.KHIMAR]: [
    FitMeasurementType.FRONT_LENGTH,
    FitMeasurementType.BACK_LENGTH,
    FitMeasurementType.WIDTH,
  ],
} satisfies Partial<
  Record<
    ProductType,
    readonly FitMeasurementType[]
  >
>;

const ONE_SIZE_ALLOWED_DIMENSIONS: Partial<
  Record<
    ProductType,
    ReadonlySet<FitMeasurementType>
  >
> = {
  [ProductType.HIJAB]: new Set([
    FitMeasurementType.GARMENT_LENGTH,
    FitMeasurementType.WIDTH,
  ]),

  [ProductType.KHIMAR]: new Set([
    FitMeasurementType.GARMENT_LENGTH,
    FitMeasurementType.FRONT_LENGTH,
    FitMeasurementType.BACK_LENGTH,
    FitMeasurementType.WIDTH,
  ]),
};

function humanize(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function formatDimensionLabel(
  type: FitMeasurementType
) {
  switch (type) {
    case FitMeasurementType.GARMENT_LENGTH:
      return "Garment length";

    case FitMeasurementType.FRONT_LENGTH:
      return "Front length";

    case FitMeasurementType.BACK_LENGTH:
      return "Back length";

    case FitMeasurementType.WIDTH:
      return "Width";

    default:
      return humanize(type);
  }
}

function makeKey() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function ProductFitMeasurementEditor({
  productId,
  productTypes,
  productSizes,
  initialMeasurements,
  initialSizeMeasurements,
}: Props) {

const router = useRouter();

const [saving, setSaving] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");
const oneSizeProductType = useMemo(() => {
  const uniqueTypes = [...new Set(productTypes)];

  if (
    uniqueTypes.length === 1 &&
    (uniqueTypes[0] === ProductType.HIJAB ||
      uniqueTypes[0] === ProductType.KHIMAR)
  ) {
    return uniqueTypes[0];
  }

  return null;
}, [productTypes]);

const isOneSizeProduct =
  oneSizeProductType !== null;
const oneSizeAllowedDimensionTypes:
  ReadonlySet<FitMeasurementType> =
    oneSizeProductType === null
      ? new Set<FitMeasurementType>()
      : ONE_SIZE_ALLOWED_DIMENSIONS[
          oneSizeProductType
        ] ??
        new Set<FitMeasurementType>();
const recommendedTypes = useMemo(() => {
const types = new Set<FitMeasurementType>();

    for (const productType of productTypes) {
      for (const measurementType of
        PRODUCT_TYPE_MEASUREMENTS[productType] ?? []) {
        types.add(measurementType);
      }
    }

    return [...types];
  }, [productTypes]);

  const defaultType =
    recommendedTypes[0] ??
    FitMeasurementType.GARMENT_LENGTH;

  const defaultComponent =
    productTypes
      .map(
        (productType) =>
          COMPONENT_BY_PRODUCT_TYPE[productType]
      )
      .find(Boolean) ??
    FitGarmentComponent.WHOLE_GARMENT;

  const [productRows, setProductRows] = useState<
  ProductRow[]
>(() => {
  const existingRows = initialMeasurements.map(
    (measurement) => ({
      key: makeKey(),
      ...measurement,
    })
  );

  if (oneSizeProductType === null) {
    return existingRows;
  }

  const component =
    COMPONENT_BY_PRODUCT_TYPE[
      oneSizeProductType
    ];

  if (!component) {
    return existingRows;
  }

  const defaultDimensions =
  ONE_SIZE_DEFAULT_DIMENSIONS[
    oneSizeProductType
  ] ?? [];

  const existingSemanticKeys = new Set(
    existingRows.map(
      (row) => `${row.type}:${row.component}`
    )
  );

  const missingRows = defaultDimensions
    .filter(
      (type) =>
        !existingSemanticKeys.has(
          `${type}:${component}`
        )
    )
    .map((type) => ({
      key: makeKey(),
      type,
      component,
      sourceMinValue: "",
      sourceMaxValue: "",
      sourceUnit: FitUnit.CM,
    }));

  return [...existingRows, ...missingRows];
});

const oneSizeProductRows =
  oneSizeProductType === null
    ? []
    : productRows.filter((row) => {
        const expectedComponent =
          COMPONENT_BY_PRODUCT_TYPE[
            oneSizeProductType
          ];

        return (
          expectedComponent !== undefined &&
          row.component === expectedComponent &&
          oneSizeAllowedDimensionTypes.has(
  row.type
)
        );
      });

  const [sizeRows, setSizeRows] = useState<
    SizeRow[]
  >(() => {
    const grouped = new Map<string, SizeRow>();

    for (const measurement of initialSizeMeasurements) {
      const semanticKey = `${measurement.type}:${measurement.component}`;

      let row = grouped.get(semanticKey);

      if (!row) {
        row = {
  key: makeKey(),
  type: measurement.type,
  component: measurement.component,
  measurementBasis:
    measurement.measurementBasis,
  sourceUnit: measurement.sourceUnit,
  values: {},
};

        grouped.set(semanticKey, row);
      }

      row.values[measurement.sizeId] = {
        min: measurement.sourceMinValue,
        max: measurement.sourceMaxValue,
      };
    }

    return [...grouped.values()];
  });

  function addProductMeasurement() {
    setProductRows((current) => [
      ...current,
      {
        key: makeKey(),
        type: defaultType,
        component: defaultComponent,
        sourceMinValue: "",
        sourceMaxValue: "",
        sourceUnit: FitUnit.CM,
      },
    ]);
  }

  function addSizeMeasurement() {
    setSizeRows((current) => [
      ...current,
      {
  key: makeKey(),
  type: defaultType,
  component: defaultComponent,
  measurementBasis: null,
  sourceUnit: FitUnit.CM,
  values: Object.fromEntries(
          productSizes.map((size) => [
            size.sizeId,
            {
              min: "",
              max: "",
            },
          ])
        ),
      },
    ]);
  }

  function updateProductRow(
    key: string,
    patch: Partial<ProductRow>
  ) {
    setProductRows((current) =>
      current.map((row) =>
        row.key === key
          ? {
              ...row,
              ...patch,
            }
          : row
      )
    );
  }

  function updateSizeRow(
    key: string,
    patch: Partial<SizeRow>
  ) {
    setSizeRows((current) =>
      current.map((row) =>
        row.key === key
          ? {
              ...row,
              ...patch,
            }
          : row
      )
    );
  }

  function updateSizeValue(
    rowKey: string,
    sizeId: string,
    field: "min" | "max",
    value: string
  ) {
    setSizeRows((current) =>
      current.map((row) => {
        if (row.key !== rowKey) {
          return row;
        }

        const existing = row.values[sizeId] ?? {
          min: "",
          max: "",
        };

        return {
          ...row,
          values: {
            ...row.values,
            [sizeId]: {
              ...existing,
              [field]: value,
            },
          },
        };
      })
    );
  }

  const productDuplicates = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const row of productRows) {
      const key = `${row.type}:${row.component}`;

      if (seen.has(key)) {
        duplicates.add(key);
      }

      seen.add(key);
    }

    return duplicates;
  }, [productRows]);

  const sizeDuplicates = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const row of sizeRows) {
      const key = `${row.type}:${row.component}`;

      if (seen.has(key)) {
        duplicates.add(key);
      }

      seen.add(key);
    }

    return duplicates;
  }, [sizeRows]);

async function saveMeasurements() {
  setSaving(true);
  setError("");
  setSuccess("");

  try {
    if (
      productDuplicates.size > 0 ||
      sizeDuplicates.size > 0
    ) {
      throw new Error(
        "Remove duplicate measurement/component combinations before saving."
      );
    }

    const rowsToSave =
  isOneSizeProduct
    ? oneSizeProductRows
    : productRows;

const productMeasurements =
  rowsToSave
    .filter(
      (row) =>
        row.sourceMinValue.trim() ||
        row.sourceMaxValue.trim()
    )
    .map((row) => ({
    type: row.type,
    component: row.component,
    sourceUnit: row.sourceUnit,
    sourceMinValue: row.sourceMinValue,
    sourceMaxValue: row.sourceMaxValue,
  }));

    const sizeMeasurements =
  isOneSizeProduct
    ? []
    : sizeRows.flatMap(
        (row) =>
          productSizes.flatMap((size) => {
          const value = row.values[size.sizeId];

          /*
           * A completely blank size cell means:
           * no product-specific measurement for
           * that size.
           */
          if (
            !value ||
            (!value.min.trim() &&
              !value.max.trim())
          ) {
            return [];
          }

          return [
  {
    sizeId: size.sizeId,
    type: row.type,
    component: row.component,
    measurementBasis:
      row.measurementBasis,
    sourceUnit: row.sourceUnit,
    sourceMinValue: value.min,
    sourceMaxValue: value.max,
  },
];
        })
    );

    const response = await fetch(
      `/api/admin/fit/products/${productId}/measurements`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productMeasurements,
          sizeMeasurements,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Unable to save measurements."
      );
    }

    setSuccess(
      `Saved ${data.productMeasurementCount} product-level and ${data.sizeMeasurementCount} size-specific measurements.`
    );

    router.refresh();
  } catch (caughtError) {
    setError(
      caughtError instanceof Error
        ? caughtError.message
        : "Unable to save measurements."
    );
  } finally {
    setSaving(false);
  }
}

  return (
    <section className="rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-black/5 px-6 py-5 md:px-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
          Product measurements
        </div>

        <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
          Product-specific Fit data
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
  {isOneSizeProduct
    ? "Record verified dimensions supplied specifically for this product."
    : "Add measurements supplied specifically for this product. Leave this empty when the product should rely on its mapped brand size chart."}
</p>
      </div>

      <div className="space-y-10 p-6 md:p-8">

        {/* Product level */}
        {isOneSizeProduct && oneSizeProductType ? (
  <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-black">
            One Size dimensions
          </h3>

          <span className="rounded-full bg-[#7B2D3E]/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7B2D3E]">
            One Size
          </span>
        </div>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
          Enter the dimensions supplied by the brand for this{" "}
          {oneSizeProductType === ProductType.HIJAB
            ? "hijab"
            : "khimar"}.
        </p>
      </div>
    </div>

    <div className="mt-5 overflow-hidden rounded-2xl border border-black/10">
      <div className="hidden grid-cols-[1fr_120px_1fr_1fr] gap-3 border-b border-black/5 bg-[#fdf7f4] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a89280] md:grid">
        <div>Dimension</div>
        <div>Unit</div>
        <div>Value</div>
        <div>Range max</div>
      </div>

      <div className="divide-y divide-black/5">
        {oneSizeProductRows.map((row) => (
          <div
            key={row.key}
            className="grid gap-3 p-4 md:grid-cols-[1fr_120px_1fr_1fr] md:items-center"
          >
            <div>
              <div className="text-xs font-medium text-neutral-400 md:hidden">
                Dimension
              </div>

              <div className="mt-1 text-sm font-medium text-black md:mt-0">
                {formatDimensionLabel(row.type)}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-neutral-400 md:hidden">
                Unit
              </div>

              <select
                value={row.sourceUnit}
                onChange={(event) =>
                  updateProductRow(row.key, {
                    sourceUnit:
                      event.target.value as FitUnit,
                  })
                }
                className={inputClass}
              >
                <option value={FitUnit.CM}>
                  CM
                </option>

                <option value={FitUnit.IN}>
                  IN
                </option>
              </select>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-neutral-400 md:hidden">
                Value
              </div>

              <input
                type="number"
                step="0.01"
                min="0"
                value={row.sourceMinValue}
                onChange={(event) =>
                  updateProductRow(row.key, {
                    sourceMinValue:
                      event.target.value,
                  })
                }
                placeholder="Value"
                className={inputClass}
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-neutral-400 md:hidden">
                Range max
              </div>

              <input
                type="number"
                step="0.01"
                min="0"
                value={row.sourceMaxValue}
                onChange={(event) =>
                  updateProductRow(row.key, {
                    sourceMaxValue:
                      event.target.value,
                  })
                }
                placeholder="Optional"
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    <p className="mt-3 text-xs leading-5 text-neutral-400">
      Use Value for a single measurement. Only add Range max
      when the brand provides a measurement range.
    </p>
  </div>
) : (
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-black">
                Product-level measurements
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                Shared product measurements.
                “Measurements supplied for this product that apply regardless of size.”
              </p>
            </div>

            <button
              type="button"
              onClick={addProductMeasurement}
              className="w-fit rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#7B2D3E] transition hover:bg-neutral-50"
            >
              + Add measurement
            </button>
          </div>

          {productRows.length === 0 ? (
            <EmptyState text="No product-level measurements." />
          ) : (
            <div className="mt-5 space-y-3">
              {productRows.map((row) => {
                const semanticKey = `${row.type}:${row.component}`;
                const duplicate =
                  productDuplicates.has(semanticKey);

                return (
                  <div
                    key={row.key}
                    className="rounded-2xl border border-black/10 p-4"
                  >
                    <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_110px_1fr_1fr_auto]">
                      <select
                        value={row.type}
                        onChange={(event) =>
                          updateProductRow(row.key, {
                            type: event.target
                              .value as FitMeasurementType,
                          })
                        }
                        className={inputClass}
                      >
                        {recommendedTypes.length > 0 ? (
                          <optgroup label="Recommended">
                            {recommendedTypes.map(
                              (type) => (
                                <option
                                  key={type}
                                  value={type}
                                >
                                  {humanize(type)}
                                </option>
                              )
                            )}
                          </optgroup>
                        ) : null}

                        <optgroup label="All measurements">
                          {Object.values(
                            FitMeasurementType
                          ).map((type) => (
                            <option
                              key={type}
                              value={type}
                            >
                              {humanize(type)}
                            </option>
                          ))}
                        </optgroup>
                      </select>

                      <select
                        value={row.component}
                        onChange={(event) =>
                          updateProductRow(row.key, {
                            component: event.target
                              .value as FitGarmentComponent,
                          })
                        }
                        className={inputClass}
                      >
                        {Object.values(
                          FitGarmentComponent
                        ).map((component) => (
                          <option
                            key={component}
                            value={component}
                          >
                            {humanize(component)}
                          </option>
                        ))}
                      </select>

                      <select
                        value={row.sourceUnit}
                        onChange={(event) =>
                          updateProductRow(row.key, {
                            sourceUnit: event.target
                              .value as FitUnit,
                          })
                        }
                        className={inputClass}
                      >
                        <option value={FitUnit.CM}>
                          CM
                        </option>
                        <option value={FitUnit.IN}>
                          IN
                        </option>
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.sourceMinValue}
                        onChange={(event) =>
                          updateProductRow(row.key, {
                            sourceMinValue:
                              event.target.value,
                          })
                        }
                        placeholder="Value"
                        className={inputClass}
                      />

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.sourceMaxValue}
                        onChange={(event) =>
                          updateProductRow(row.key, {
                            sourceMaxValue:
                              event.target.value,
                          })
                        }
                        placeholder="Range max"
                        className={inputClass}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setProductRows((current) =>
                            current.filter(
                              (item) =>
                                item.key !== row.key
                            )
                          )
                        }
                        className="rounded-xl px-3 py-2 text-sm text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    {duplicate ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        This measurement and component
                        combination already exists.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
)}


       {/* Size-specific */}
{!isOneSizeProduct ? (
  <div className="border-t border-black/5 pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-black">
                Size-specific measurements
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                Measurements by product size.
                “Measurements supplied specifically for this product's individual sizes.”
              </p>
            </div>

            <button
              type="button"
              onClick={addSizeMeasurement}
              disabled={productSizes.length === 0}
              className="w-fit rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#7B2D3E] transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add measurement
            </button>
          </div>

          {productSizes.length === 0 ? (
            <EmptyState text="This product has no catalogue sizes." />
          ) : sizeRows.length === 0 ? (
            <EmptyState text="No size-specific measurements." />
          ) : (
            <div className="mt-5 space-y-5">
              {sizeRows.map((row) => {
                const semanticKey = `${row.type}:${row.component}`;
                const duplicate =
                  sizeDuplicates.has(semanticKey);

                return (
                  <div
                    key={row.key}
                    className="overflow-hidden rounded-2xl border border-black/10"
                  >
                    <div className="grid gap-3 border-b border-black/5 bg-neutral-50 p-4 md:grid-cols-4">
                      <select
                        value={row.type}
                        onChange={(event) =>
                          updateSizeRow(row.key, {
                            type: event.target
                              .value as FitMeasurementType,
                          })
                        }
                        className={inputClass}
                      >
                        {recommendedTypes.length > 0 ? (
                          <optgroup label="Recommended">
                            {recommendedTypes.map(
                              (type) => (
                                <option
                                  key={type}
                                  value={type}
                                >
                                  {humanize(type)}
                                </option>
                              )
                            )}
                          </optgroup>
                        ) : null}

                        <optgroup label="All measurements">
                          {Object.values(
                            FitMeasurementType
                          ).map((type) => (
                            <option
                              key={type}
                              value={type}
                            >
                              {humanize(type)}
                            </option>
                          ))}
                        </optgroup>
                      </select>


                      <select
                        value={row.component}
                        onChange={(event) =>
                          updateSizeRow(row.key, {
                            component: event.target
                              .value as FitGarmentComponent,
                          })
                        }
                        className={inputClass}
                      >
                        {Object.values(
                          FitGarmentComponent
                        ).map((component) => (
                          <option
                            key={component}
                            value={component}
                          >
                            {humanize(component)}
                          </option>
                        ))}
                      </select>
                      <select
  value={row.measurementBasis ?? ""}
  onChange={(event) =>
    updateSizeRow(row.key, {
      measurementBasis:
        event.target.value === ""
          ? null
          : (event.target
              .value as FitMeasurementBasis),
    })
  }
  className={inputClass}
>
  <option value="">
    Basis: Inherit product setting
  </option>

  <option value={FitMeasurementBasis.BODY}>
    Basis: Body
  </option>

  <option value={FitMeasurementBasis.GARMENT}>
    Basis: Garment
  </option>

  <option value={FitMeasurementBasis.UNKNOWN}>
    Basis: Unknown
  </option>
</select>

                      <div className="flex gap-2">
                        <select
                          value={row.sourceUnit}
                          onChange={(event) =>
                            updateSizeRow(row.key, {
                              sourceUnit: event.target
                                .value as FitUnit,
                            })
                          }
                          className={inputClass}
                        >
                          <option value={FitUnit.CM}>
                            CM
                          </option>
                          <option value={FitUnit.IN}>
                            IN
                          </option>
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            setSizeRows((current) =>
                              current.filter(
                                (item) =>
                                  item.key !== row.key
                              )
                            )
                          }
                          className="rounded-xl border border-black/10 px-3 text-sm text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {duplicate ? (
                      <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-600">
                        This measurement and component
                        combination already exists.
                      </div>
                    ) : null}

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-[#fdf7f4]">
                          <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-[#a89280]">
                            <th className="px-4 py-3 font-semibold">
                              Size
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              Value
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              Range max
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-black/5">
                          {productSizes.map((size) => {
                            const value =
                              row.values[size.sizeId] ?? {
                                min: "",
                                max: "",
                              };

                            return (
                              <tr key={size.sizeId}>
                                <td className="px-4 py-3 font-medium text-black">
                                  {size.sizeName}
                                </td>

                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={value.min}
                                    onChange={(event) =>
                                      updateSizeValue(
                                        row.key,
                                        size.sizeId,
                                        "min",
                                        event.target.value
                                      )
                                    }
                                    className={inputClass}
                                  />
                                </td>

                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={value.max}
                                    onChange={(event) =>
                                      updateSizeValue(
                                        row.key,
                                        size.sizeId,
                                        "max",
                                        event.target.value
                                      )
                                    }
                                    className={inputClass}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
): null}

        <div className="rounded-2xl border border-[#7B2D3E]/10 bg-[#7B2D3E]/[0.03] px-5 py-4">
          <p className="text-sm leading-6 text-neutral-600">
  {isOneSizeProduct
    ? "Enter only dimensions provided by the brand. Leave a dimension blank when the source does not provide it."
    : "No measurements are required here when a product relies entirely on its mapped brand size chart. Product-specific data should only be entered when the source actually provides it."}
</p>
        </div>

        <div className="flex justify-end border-t border-black/5 pt-6">
          <div className="flex flex-col gap-4 border-t border-black/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
  <div>
    {error ? (
      <p className="text-sm font-medium text-red-600">
        {error}
      </p>
    ) : null}

    {success ? (
      <p className="text-sm font-medium text-emerald-700">
        {success}
      </p>
    ) : null}
  </div>

  <button
    type="button"
    onClick={saveMeasurements}
    disabled={saving}
    className="rounded-2xl bg-[#7B2D3E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#692536] disabled:cursor-not-allowed disabled:opacity-50"
  >
    {saving
      ? "Saving..."
      : "Save measurements"}
  </button>
</div>
        </div>
      </div>
    </section>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-neutral-50 px-5 py-5 text-sm text-neutral-500">
      {text}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-neutral-800 outline-none transition focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10";
