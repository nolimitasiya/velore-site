"use client";

import {
  FitDataSource,
  FitUnit,
  ProductLengthStructure,
} from "@prisma/client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InitialLengthOption = {
  id: string;
  label: string;
  sourceValue: string;
  sourceUnit: FitUnit | null;
  source: FitDataSource | null;
  sourceUrl: string;
  sourceNotes: string;
  lastVerifiedAt: string;
};

type LengthOptionRow = InitialLengthOption & {
  key: string;
};

type Props = {
  productId: string;
  initialStructure: ProductLengthStructure | null;
  initialOptions: InitialLengthOption[];
};

function makeKey() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

export default function ProductLengthEditor({
  productId,
  initialStructure,
  initialOptions,
}: Props) {
  const router = useRouter();

  const [structure, setStructure] = useState<
    ProductLengthStructure | ""
  >(initialStructure ?? "");

  const [rows, setRows] = useState<LengthOptionRow[]>(
    () =>
      initialOptions.map((option) => ({
        ...option,
        key: option.id,
      }))
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isIndependent =
    structure === ProductLengthStructure.INDEPENDENT;

  function addOption() {
    setRows((current) => [
      ...current,
      {
        id: "",
        key: makeKey(),
        label: "",
        sourceValue: "",
        sourceUnit: FitUnit.IN,
        source: null,
        sourceUrl: "",
        sourceNotes: "",
        lastVerifiedAt: "",
      },
    ]);
  }

  function updateRow(
    key: string,
    patch: Partial<LengthOptionRow>
  ) {
    setRows((current) =>
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

  function removeRow(key: string) {
    setRows((current) =>
      current.filter((row) => row.key !== key)
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/fit/products/${productId}/lengths`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            lengthStructure: structure || null,

            options: isIndependent
              ? rows.map((row) => ({
                  id: row.id || null,
                  label: row.label,
                  sourceValue:
                    row.sourceValue.trim() || null,
                  sourceUnit:
                    row.sourceValue.trim()
                      ? row.sourceUnit
                      : null,
                  source:
                    row.sourceValue.trim()
                      ? row.source
                      : null,
                  sourceUrl:
                    row.sourceValue.trim()
                      ? row.sourceUrl
                      : "",
                  sourceNotes: row.sourceNotes,
                  lastVerifiedAt:
                    row.sourceValue.trim()
                      ? row.lastVerifiedAt || null
                      : null,
                }))
              : [],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save product length data."
        );
      }

      setSuccess(
        `Length data saved. ${data.optionCount} independent option${
          data.optionCount === 1 ? "" : "s"
        }.`
      );

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save product length data."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-black/5 px-6 py-5 md:px-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
          Product length
        </div>

        <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
          Length architecture
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
          Define how length is represented for this
          product. Verified numerical values can be used
          by Veilora Fit without inferring measurements
          from catalogue labels.
        </p>
      </div>

      <div className="space-y-8 p-6 md:p-8">
        <div>
          <h3 className="text-base font-semibold text-black">
            Length structure
          </h3>

          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Choose how shoppers select length for this
            product.
          </p>

          <div className="mt-4 max-w-xl">
            <Field label="Structure">
              <select
                value={structure}
                onChange={(event) => {
                  setStructure(
                    event.target
                      .value as ProductLengthStructure | ""
                  );

                  setError("");
                  setSuccess("");
                }}
                className={inputClass}
              >
                <option value="">
                  Not classified
                </option>

                {Object.values(
                  ProductLengthStructure
                ).map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {structure ===
          ProductLengthStructure.INDEPENDENT ? (
            <InfoBox>
              Length is selected separately from the
              conventional product size. Example: M +
              58&quot;.
            </InfoBox>
          ) : null}

          {structure ===
          ProductLengthStructure.SIZE_DEPENDENT ? (
            <InfoBox>
              Garment length varies with the conventional
              product size. Length evidence belongs to the
              product&apos;s size-specific measurements.
            </InfoBox>
          ) : null}

          {structure ===
          ProductLengthStructure.LENGTH_BASED_SIZE ? (
            <InfoBox>
              The purchasable size itself represents
              length, such as an abaya offered as 54, 56,
              58, 60 and 62.
            </InfoBox>
          ) : null}
        </div>

        {isIndependent ? (
          <div className="border-t border-black/5 pt-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-black">
                  Independent length options
                </h3>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
                  Enter the exact shopper-facing label
                  and, when supplied by the source, its
                  verified numerical value and unit.
                </p>
              </div>

              <button
                type="button"
                onClick={addOption}
                className="w-fit rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#7B2D3E] transition hover:bg-neutral-50"
              >
                + Add length
              </button>
            </div>

            {rows.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-neutral-50 px-5 py-5 text-sm text-neutral-500">
                No independent length options.
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {rows.map((row, index) => {
                  const hasNumericValue =
                    row.sourceValue.trim() !== "";

                  return (
                    <div
                      key={row.key}
                      className="rounded-2xl border border-black/10 p-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold text-black">
                          Length option {index + 1}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeRow(row.key)
                          }
                          className="rounded-xl px-3 py-2 text-sm text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <Field label="Display label">
                          <input
                            value={row.label}
                            onChange={(event) =>
                              updateRow(row.key, {
                                label:
                                  event.target.value,
                              })
                            }
                            placeholder={'e.g. 58" or Tall'}
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Source value">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.sourceValue}
                            onChange={(event) =>
                              updateRow(row.key, {
                                sourceValue:
                                  event.target.value,
                              })
                            }
                            placeholder="e.g. 58"
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Source unit">
                          <select
                            value={row.sourceUnit ?? ""}
                            disabled={!hasNumericValue}
                            onChange={(event) =>
                              updateRow(row.key, {
                                sourceUnit:
                                  event.target
                                    .value as FitUnit,
                              })
                            }
                            className={inputClass}
                          >
                            <option value="">
                              Select unit
                            </option>
                            <option value={FitUnit.CM}>
                              CM
                            </option>
                            <option value={FitUnit.IN}>
                              IN
                            </option>
                          </select>
                        </Field>
                      </div>

                      {!hasNumericValue ? (
                        <p className="mt-3 text-xs leading-5 text-neutral-400">
                          Without a verified numerical
                          value, this option remains a
                          valid catalogue label but will
                          not be used for numerical length
                          recommendations.
                        </p>
                      ) : null}

                      {hasNumericValue ? (
                        <div className="mt-6 border-t border-black/5 pt-5">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                            Provenance
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <Field label="Data source">
                              <select
                                value={row.source ?? ""}
                                onChange={(event) =>
                                  updateRow(row.key, {
                                    source:
                                      event.target.value
                                        ? (event.target
                                            .value as FitDataSource)
                                        : null,
                                  })
                                }
                                className={inputClass}
                              >
                                <option value="">
                                  Not set
                                </option>

                                {Object.values(
                                  FitDataSource
                                ).map((value) => (
                                  <option
                                    key={value}
                                    value={value}
                                  >
                                    {humanize(value)}
                                  </option>
                                ))}
                              </select>
                            </Field>

                            <Field label="Last verified">
                              <input
                                type="date"
                                value={
                                  row.lastVerifiedAt
                                }
                                onChange={(event) =>
                                  updateRow(row.key, {
                                    lastVerifiedAt:
                                      event.target.value,
                                  })
                                }
                                className={inputClass}
                              />
                            </Field>

                            <div className="md:col-span-2">
                              <Field label="Source URL">
                                <input
                                  type="url"
                                  value={row.sourceUrl}
                                  onChange={(event) =>
                                    updateRow(row.key, {
                                      sourceUrl:
                                        event.target.value,
                                    })
                                  }
                                  placeholder="https://..."
                                  className={inputClass}
                                />
                              </Field>
                            </div>

                            <div className="md:col-span-2">
                              <Field label="Source notes">
                                <textarea
                                  value={row.sourceNotes}
                                  onChange={(event) =>
                                    updateRow(row.key, {
                                      sourceNotes:
                                        event.target.value,
                                    })
                                  }
                                  rows={3}
                                  placeholder="Optional notes about this length evidence..."
                                  className={inputClass}
                                />
                              </Field>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#7B2D3E]/10 bg-[#7B2D3E]/[0.03] px-5 py-4">
          <p className="text-sm leading-6 text-neutral-600">
            Veilora Fit only uses verified numerical
            length evidence. A catalogue label is never
            interpreted as centimetres or inches unless
            its source value and unit are explicitly
            recorded.
          </p>
        </div>

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
            onClick={save}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl bg-[#7B2D3E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#692536] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save length data"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-medium text-neutral-500">
        {label}
      </div>

      {children}
    </label>
  );
}

function InfoBox({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 max-w-3xl rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-600">
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-neutral-800 outline-none transition focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400";