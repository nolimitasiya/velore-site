"use client";

import {
  FitGarmentComponent,
  FitMeasurementType,
  FitUnit,
  ProductType,
} from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getDefaultGarmentComponent } from "@/lib/fit/defaultGarmentComponent";

type InitialMeasurement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
  sourceMinValue: string;
  sourceMaxValue: string;
};

type InitialEntry = {
  id: string;
  sizeLabel: string;
  measurements: InitialMeasurement[];
};

type MeasurementRow = {
  id: string;
  label: string;
  type: FitMeasurementType;
  component: FitGarmentComponent;
  values: Record<
    string,
    {
      min: string;
      max: string;
    }
  >;
};

type Props = {
  chartId: string;
  sourceUnit: FitUnit;
  productTypes: ProductType[];
  initialEntries: InitialEntry[];
};

const MEASUREMENT_TYPES = Object.values(FitMeasurementType);
const COMPONENTS = Object.values(FitGarmentComponent);


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

function makeId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function defaultLabel(
  type: FitMeasurementType,
  component: FitGarmentComponent
) {
  if (
    type === FitMeasurementType.WAIST &&
    component === FitGarmentComponent.SKIRT
  ) {
    return "Skirt Waist";
  }

  if (
    type === FitMeasurementType.FRONT_LENGTH &&
    component === FitGarmentComponent.SKIRT
  ) {
    return "Front Skirt Length";
  }

  return humanize(type);
}

function buildInitialRows(
  entries: InitialEntry[]
): MeasurementRow[] {
  const definitions = new Map<
    string,
    {
      type: FitMeasurementType;
      component: FitGarmentComponent;
    }
  >();

  for (const entry of entries) {
    for (const measurement of entry.measurements) {
      const key = `${measurement.type}:${measurement.component}`;

      if (!definitions.has(key)) {
        definitions.set(key, {
          type: measurement.type,
          component: measurement.component,
        });
      }
    }
  }

  return [...definitions.values()].map((definition) => {
    const values: MeasurementRow["values"] = {};

    entries.forEach((entry, index) => {
      const measurement = entry.measurements.find(
        (item) =>
          item.type === definition.type &&
          item.component === definition.component
      );

      values[String(index)] = {
        min: measurement?.sourceMinValue ?? "",
        max: measurement?.sourceMaxValue ?? "",
      };
    });

    return {
      id: makeId(),
      label: defaultLabel(
        definition.type,
        definition.component
      ),
      type: definition.type,
      component: definition.component,
      values,
    };
  });
}

export default function SizeChartMeasurementEditor({
  chartId,
  sourceUnit,
  productTypes,
  initialEntries,
}: Props) {
  const router = useRouter();
  const defaultComponent =
  getDefaultGarmentComponent(productTypes);

  const [sizes, setSizes] = useState<string[]>(
    initialEntries.map((entry) => entry.sizeLabel)
  );
  const [entryIds, setEntryIds] = useState<(string | null)[]>(
     initialEntries.map((entry) => entry.id)
);

  const [rows, setRows] = useState<MeasurementRow[]>(
    () => buildInitialRows(initialEntries)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasExistingData =
    initialEntries.length > 0;

  const unitLabel =
    sourceUnit === FitUnit.CM ? "CM" : "IN";

  const duplicateMeasurement = useMemo(() => {
    const seen = new Set<string>();

    for (const row of rows) {
      const key = `${row.type}:${row.component}`;

      if (seen.has(key)) {
        return key;
      }

      seen.add(key);
    }

    return null;
  }, [rows]);

  function addSize() {
    const newIndex = sizes.length;

    setSizes((current) => [...current, ""]);
    setEntryIds((current) => [...current, null]);

    setRows((current) =>
      current.map((row) => ({
        ...row,
        values: {
          ...row.values,
          [String(newIndex)]: {
            min: "",
            max: "",
          },
        },
      }))
    );

    setSuccess("");
  }

  function removeSize(index: number) {
    setSizes((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
    setEntryIds((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );

    setRows((current) =>
      current.map((row) => {
        const values: MeasurementRow["values"] = {};

        Object.values(row.values)
          .filter((_, itemIndex) => itemIndex !== index)
          .forEach((value, newIndex) => {
            values[String(newIndex)] = value;
          });

        return {
          ...row,
          values,
        };
      })
    );

    setSuccess("");
  }

  function updateSize(index: number, value: string) {
    setSizes((current) =>
      current.map((size, itemIndex) =>
        itemIndex === index ? value : size
      )
    );

    setSuccess("");
  }

  function addMeasurement() {
    const values: MeasurementRow["values"] = {};

    sizes.forEach((_, index) => {
      values[String(index)] = {
        min: "",
        max: "",
      };
    });

    setRows((current) => [
      ...current,
      {
        id: makeId(),
        label: "Bust",
        type: FitMeasurementType.BUST,
        component: defaultComponent,
        values,
      },
    ]);

    setSuccess("");
  }

  function removeMeasurement(id: string) {
    setRows((current) =>
      current.filter((row) => row.id !== id)
    );

    setSuccess("");
  }

  function updateRow(
    id: string,
    patch: Partial<
      Pick<
        MeasurementRow,
        "label" | "type" | "component"
      >
    >
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const next = {
          ...row,
          ...patch,
        };

        if (
          patch.type !== undefined ||
          patch.component !== undefined
        ) {
          next.label = defaultLabel(
            next.type,
            next.component
          );
        }

        return next;
      })
    );

    setSuccess("");
  }

  function updateValue(
    rowId: string,
    sizeIndex: number,
    field: "min" | "max",
    value: string
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const currentValue =
          row.values[String(sizeIndex)] ?? {
            min: "",
            max: "",
          };

        return {
          ...row,
          values: {
            ...row.values,
            [String(sizeIndex)]: {
              ...currentValue,
              [field]: value,
            },
          },
        };
      })
    );

    setSuccess("");
  }

  async function save() {
    setError("");
    setSuccess("");

    const cleanedSizes = sizes.map((size) =>
      size.trim()
    );

    if (cleanedSizes.length === 0) {
      setError("Add at least one size.");
      return;
    }

    if (cleanedSizes.some((size) => !size)) {
      setError("Every size needs a label.");
      return;
    }

    const normalizedSizes = cleanedSizes.map((size) =>
      size.toLowerCase()
    );

    if (
      new Set(normalizedSizes).size !==
      normalizedSizes.length
    ) {
      setError("Size labels must be unique.");
      return;
    }

    if (rows.length === 0) {
      setError("Add at least one measurement.");
      return;
    }

    if (duplicateMeasurement) {
      setError(
        "Each measurement type and component combination must be unique."
      );
      return;
    }

    for (const row of rows) {
      for (
        let sizeIndex = 0;
        sizeIndex < cleanedSizes.length;
        sizeIndex += 1
      ) {
        const value =
          row.values[String(sizeIndex)];

        if (!value?.min.trim()) {
          setError(
            `Enter a value for ${row.label} — ${cleanedSizes[sizeIndex]}.`
          );
          return;
        }
      }
    }

    const entries = cleanedSizes.map(
      (sizeLabel, sizeIndex) => ({
        entryId: entryIds[sizeIndex] ?? null,
        sizeLabel,

        measurements: rows.map((row) => {
          const value =
            row.values[String(sizeIndex)];

          return {
            type: row.type,
            component: row.component,
            minValue: value.min.trim(),

            maxValue:
              value.max.trim() ||
              value.min.trim(),
          };
        }),
      })
    );

    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/fit/size-charts/${chartId}/entries`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entries,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Unable to save size chart."
        );
      }

      setSuccess(
        `Saved ${result.sizeCount} sizes and ${result.measurementCount} measurements.`
      );

      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save size chart."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-black/5 px-6 py-5 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
            Size data
          </div>

          <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
            Size rows &amp; measurements
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
            Enter the chart exactly as supplied by the
            brand. A single value can be entered on its own;
            use the range field only when the source
            provides a range.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#fdf7f4] px-3 py-1.5 text-xs font-medium text-[#7B2D3E]">
            Source unit · {unitLabel}
          </span>

          {hasExistingData ? (
            <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500">
              Editing existing chart
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-b border-black/5 px-6 py-4 md:px-8">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addSize}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            + Add size
          </button>

          <button
            type="button"
            onClick={addMeasurement}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            + Add measurement
          </button>
        </div>
      </div>

      {sizes.length === 0 ? (
        <div className="px-6 py-16 text-center md:px-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf7f4] text-[#7B2D3E]">
            <i
              className="ti ti-ruler-2 text-xl"
              aria-hidden="true"
            />
          </div>

          <h3 className="mt-4 text-lg font-semibold text-black">
            Build the source chart
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">
            Start by adding the size labels exactly as the
            brand publishes them.
          </p>

          <button
            type="button"
            onClick={addSize}
            className="mt-5 rounded-xl bg-[#7B2D3E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#682635]"
          >
            Add first size
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="bg-[#fdf7f4]">
                  <th className="sticky left-0 z-20 min-w-[260px] border-b border-r border-black/5 bg-[#fdf7f4] px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a89280]">
                    Measurement
                  </th>

                  {sizes.map((size, index) => (
                    <th
                      key={index}
                      className="min-w-[170px] border-b border-r border-black/5 px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          value={size}
                          onChange={(event) =>
                            updateSize(
                              index,
                              event.target.value
                            )
                          }
                          placeholder={`Size ${
                            index + 1
                          }`}
                          className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-center text-sm font-semibold text-black outline-none transition focus:border-[#7B2D3E]/50"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeSize(index)
                          }
                          title="Remove size"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-white hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="sticky left-0 z-10 border-r border-black/5 bg-white px-5 py-4 align-top">
                      <div className="space-y-2">
                        <input
                          value={row.label}
                          onChange={(event) =>
                            updateRow(row.id, {
                              label:
                                event.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#7B2D3E]/50"
                        />

                        <select
                          value={row.type}
                          onChange={(event) =>
                            updateRow(row.id, {
                              type: event.target
                                .value as FitMeasurementType,
                            })
                          }
                          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-neutral-600 outline-none focus:border-[#7B2D3E]/50"
                        >
                          {MEASUREMENT_TYPES.map(
                            (type) => (
                              <option
                                key={type}
                                value={type}
                              >
                                {humanize(type)}
                              </option>
                            )
                          )}
                        </select>

                        <select
                          value={row.component}
                          onChange={(event) =>
                            updateRow(row.id, {
                              component: event
                                .target
                                .value as FitGarmentComponent,
                            })
                          }
                          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-neutral-600 outline-none focus:border-[#7B2D3E]/50"
                        >
                          {COMPONENTS.map(
                            (component) => (
                              <option
                                key={component}
                                value={component}
                              >
                                {humanize(
                                  component
                                )}
                              </option>
                            )
                          )}
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            removeMeasurement(row.id)
                          }
                          className="text-xs font-medium text-red-400 hover:text-red-600"
                        >
                          Remove measurement
                        </button>
                      </div>
                    </td>

                    {sizes.map((_, sizeIndex) => {
                      const value =
                        row.values[
                          String(sizeIndex)
                        ] ?? {
                          min: "",
                          max: "",
                        };

                      return (
                        <td
                          key={sizeIndex}
                          className="border-r border-black/5 px-4 py-4 align-top"
                        >
                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                                Value
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={value.min}
                                onChange={(event) =>
                                  updateValue(
                                    row.id,
                                    sizeIndex,
                                    "min",
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="—"
                                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-[#7B2D3E]/50"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                                Range max
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={value.max}
                                onChange={(event) =>
                                  updateValue(
                                    row.id,
                                    sizeIndex,
                                    "max",
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="Same"
                                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-[#7B2D3E]/50"
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 ? (
            <div className="border-t border-black/5 px-6 py-10 text-center text-sm text-neutral-500">
              Your sizes are ready. Add the first
              measurement row.
            </div>
          ) : null}

          <div className="flex flex-col gap-4 border-t border-black/5 bg-neutral-50/50 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              {error ? (
                <p className="text-sm font-medium text-red-600">
                  {error}
                </p>
              ) : success ? (
                <p className="text-sm font-medium text-emerald-700">
                  {success}
                </p>
              ) : (
                <p className="text-xs leading-5 text-neutral-400">
                  Blank range max = same as the entered
                  value.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-[#7B2D3E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#682635] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : "Save size chart"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}