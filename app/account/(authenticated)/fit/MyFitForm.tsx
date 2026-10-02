"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HowToMeasureDrawer from "./HowToMeasureDrawer";

type FitUnit = "CM" | "IN";

type FitPreference =
  | "CLOSER"
  | "REGULAR"
  | "RELAXED";

type MeasurementType =
  | "HEIGHT"
  | "BUST"
  | "WAIST"
  | "HIP"
  | "GARMENT_LENGTH";

type SavedMeasurement = {
  type: MeasurementType;
  valueCm: string;
};

type FitProfile = {
  id: string;
  preferredUnit: FitUnit;
  fitPreference: FitPreference;
  hijabCoveragePreference: string | null;
  measurements: SavedMeasurement[];
  createdAt: string;
  updatedAt: string;
};

type MeasurementValues = Record<
  MeasurementType,
  string
>;

const EMPTY_MEASUREMENTS: MeasurementValues = {
  HEIGHT: "",
  BUST: "",
  WAIST: "",
  HIP: "",
  GARMENT_LENGTH: "",
};

const MEASUREMENT_FIELDS: Array<{
  type: MeasurementType;
  label: string;
  help: string;
}> = [
  {
    type: "HEIGHT",
    label: "Height",
    help: "Your full height.",
  },
  {
    type: "BUST",
    label: "Bust",
    help: "Measure around the fullest part of your bust.",
  },
  {
    type: "WAIST",
    label: "Waist",
    help: "Measure around your natural waist.",
  },
  {
    type: "HIP",
    label: "Hips",
    help: "Measure around the fullest part of your hips.",
  },

  {
  type: "GARMENT_LENGTH",
  label: "Preferred maxi length",
  help:
    "Measure from the highest point of your shoulder down to where you prefer a full-length dress, abaya or jilbab to finish.",
},
];

const BODY_MEASUREMENT_TYPES: MeasurementType[] = [
  "HEIGHT",
  "BUST",
  "WAIST",
  "HIP",
];

const PREFERENCE_MEASUREMENT_TYPES: MeasurementType[] = [
  "GARMENT_LENGTH",
];

const BODY_MEASUREMENT_FIELDS =
  MEASUREMENT_FIELDS.filter((field) =>
    BODY_MEASUREMENT_TYPES.includes(field.type)
  );

const PREFERENCE_MEASUREMENT_FIELDS =
  MEASUREMENT_FIELDS.filter((field) =>
    PREFERENCE_MEASUREMENT_TYPES.includes(field.type)
  );

const FIT_OPTIONS: Array<{
  value: FitPreference;
  title: string;
  description: string;
}> = [
  {
    value: "CLOSER",
    title: "Closer",
    description: "A more fitted silhouette.",
  },
  {
    value: "REGULAR",
    title: "Regular",
    description: "A balanced, comfortable fit.",
  },
  {
    value: "RELAXED",
    title: "Relaxed",
    description: "More room through the garment.",
  },
];

function cmToDisplayValue(
  valueCm: string,
  unit: FitUnit
) {
  const value = Number(valueCm);

  if (!Number.isFinite(value)) {
    return "";
  }

  if (unit === "CM") {
    return Number(value.toFixed(2)).toString();
  }

return Math.round(value / 2.54).toString();
}

export default function MyFitForm() {
  const router = useRouter();

  const [unit, setUnit] =
    useState<FitUnit>("CM");

  const [fitPreference, setFitPreference] =
  useState<FitPreference>("REGULAR");

const [measurements, setMeasurements] =
  useState<MeasurementValues>(
    EMPTY_MEASUREMENTS
  );

const [canonicalMeasurements, setCanonicalMeasurements] =
  useState<MeasurementValues>(
    EMPTY_MEASUREMENTS
  );

const [loading, setLoading] =
  useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [savedMessage, setSavedMessage] =
    useState<string | null>(null);
  const [measureGuideOpen, setMeasureGuideOpen] =
  useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch(
          "/api/account/fit",
          {
            credentials: "include",
          }
        );

        if (response.status === 401) {
          router.replace("/account/login");
          return;
        }

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ??
              "Unable to load your Fit profile."
          );
        }

        const profile =
          data.profile as FitProfile | null;

        if (!profile) {
          setLoading(false);
          return;
        }

        setUnit(profile.preferredUnit);
        setFitPreference(
          profile.fitPreference
        );

        const nextCanonicalMeasurements = {
  ...EMPTY_MEASUREMENTS,
};

const nextDisplayedMeasurements = {
  ...EMPTY_MEASUREMENTS,
};

for (const measurement of profile.measurements) {
  if (
    measurement.type in
    nextCanonicalMeasurements
  ) {
    nextCanonicalMeasurements[
      measurement.type
    ] = measurement.valueCm;

    nextDisplayedMeasurements[
      measurement.type
    ] = cmToDisplayValue(
      measurement.valueCm,
      profile.preferredUnit
    );
  }
}

setCanonicalMeasurements(
  nextCanonicalMeasurements
);

setMeasurements(
  nextDisplayedMeasurements
);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your Fit profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  function changeUnit(nextUnit: FitUnit) {
  if (nextUnit === unit) {
    return;
  }

  const nextDisplayedMeasurements = {
    ...EMPTY_MEASUREMENTS,
  };

  for (const field of MEASUREMENT_FIELDS) {
    nextDisplayedMeasurements[field.type] =
      cmToDisplayValue(
        canonicalMeasurements[field.type],
        nextUnit
      );
  }

  setMeasurements(nextDisplayedMeasurements);
  setUnit(nextUnit);
  setSavedMessage(null);
}

  function updateMeasurement(
  type: MeasurementType,
  value: string
) {
  setMeasurements((current) => ({
    ...current,
    [type]: value,
  }));

  const parsed = Number(value);

  setCanonicalMeasurements((current) => ({
    ...current,
    [type]:
      !value.trim() || !Number.isFinite(parsed)
        ? ""
        : unit === "CM"
          ? value
          : (parsed * 2.54).toString(),
  }));

  setSavedMessage(null);
}

  async function saveProfile() {
    setError(null);
    setSavedMessage(null);

    const submittedMeasurements =
  MEASUREMENT_FIELDS.flatMap(
    (field) => {
      const raw =
        canonicalMeasurements[field.type].trim();

      if (!raw) {
        return [];
      }

      const valueCm = Number(raw);

      if (
        !Number.isFinite(valueCm) ||
        valueCm <= 0
      ) {
        throw new Error(
          `Enter a valid ${field.label.toLowerCase()} measurement.`
        );
      }

      return [
        {
          type: field.type,
          value: valueCm,
        },
      ];
    }
  );

    setSaving(true);

    try {
      const response = await fetch(
        "/api/account/fit",
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            preferredUnit: unit,
            fitPreference,
            hijabCoveragePreference:
              null,
            measurements:
              submittedMeasurements,
          }),
        }
      );

      if (response.status === 401) {
        router.replace("/account/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ??
            "Unable to save your Fit profile."
        );
      }

      setSavedMessage(
        "Your Fit profile has been saved."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your Fit profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-sm text-[#a89280]">
        Loading your Fit profile...
      </div>
    );
  }

 return (
  <>
    <div className="space-y-10">
      <section className="border-b border-[#ded1c7] pb-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
  <p className="text-[11px] uppercase tracking-[0.2em] text-[#7B2D3E]">
    Your measurements
  </p>

  <h2 className="mt-2 font-heading text-2xl text-[#1a0a0e]">
    Your measurements
  </h2>

  <p className="mt-2 max-w-xl text-sm leading-6 text-[#8b7768]">
    Add the measurements you know. You can leave
    anything you&apos;re unsure about blank and come
    back to it later.
  </p>

  <button
    type="button"
    onClick={() => setMeasureGuideOpen(true)}
    className="mt-4 inline-flex items-center gap-2 text-m font-medium text-[#7B2D3E] transition hover:opacity-70"
  >
    How to measure
    <span aria-hidden="true">→</span>
  </button>
</div>

          <div className="inline-flex w-fit items-center rounded-full border border-[#e8ddd4] p-1">
            {(["CM", "IN"] as FitUnit[]).map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    changeUnit(option)
                  }
                  className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                    unit === option
                      ? "bg-[#7B2D3E] text-white"
                      : "text-[#8b7768] hover:text-[#7B2D3E]"
                  }`}
                >
                  {option === "CM"
                    ? "cm"
                    : "in"}
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {BODY_MEASUREMENT_FIELDS.map(
            (field) => (
              <label
                key={field.type}
                className="block"
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-[#1a0a0e]">
                    {field.label}
                  </span>

                  <span className="text-xs text-[#b3a294]">
                    {unit === "CM"
                      ? "cm"
                      : "in"}
                  </span>
                </div>

                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={
                    measurements[field.type]
                  }
                  onChange={(event) =>
                    updateMeasurement(
                      field.type,
                      event.target.value
                    )
                  }
                  className="w-full border-0 border-b border-[#d8c9be] bg-transparent px-0 py-3 text-base text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]"
                />

                <p className="mt-2 text-xs leading-5 text-[#a89280]">
                  {field.help}
                </p>
              </label>
            )
          )}
        </div>

        <p className="mt-6 text-xs text-[#a89280]">
  {
    BODY_MEASUREMENT_FIELDS.filter(
      (field) =>
        measurements[field.type].trim() !== ""
    ).length
  }{" "}
  of {BODY_MEASUREMENT_FIELDS.length} measurements added
</p>
      </section>

      <section className="pb-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#7B2D3E]">
  Your preferences
</p>

<h2 className="mt-2 font-heading text-2xl text-[#1a0a0e]">
  How do you like to wear your clothes?
</h2>

<p className="mt-2 max-w-xl text-sm leading-6 text-[#8b7768]">
  Tell us a little about your preferred length and fit.
  We&apos;ll use these alongside your measurements when
  they&apos;re relevant to a product.
</p>
<div className="mt-10 max-w-md">
  {PREFERENCE_MEASUREMENT_FIELDS.map((field) => (
    <label key={field.type} className="block">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-[#1a0a0e]">
          {field.label}
        </span>

        <span className="text-xs text-[#b3a294]">
          {unit === "CM" ? "cm" : "in"}
        </span>
      </div>

      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={measurements[field.type]}
        onChange={(event) =>
          updateMeasurement(
            field.type,
            event.target.value
          )
        }
        className="w-full border-0 border-b border-[#d8c9be] bg-transparent px-0 py-3 text-base text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]"
      />

      <p className="mt-2 text-xs leading-5 text-[#a89280]">
        {field.help}
      </p>
    </label>
  ))}
</div>
<div className="mt-8 border-t border-[#eee5de] pt-7">
  <p className="text-sm font-medium text-[#1a0a0e]">
    Fit preference
  </p>

  <p className="mt-1 text-xs leading-5 text-[#a89280]">
    Choose the silhouette you generally feel most comfortable wearing.
  </p>
</div>
        <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-3">

          {FIT_OPTIONS.map((option) => {
            const selected =
              fitPreference === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFitPreference(
                    option.value
                  );
                  setSavedMessage(null);
                }}
                className={`border-b py-4 text-left transition ${
  selected
    ? "border-[#7B2D3E]"
    : "border-[#d8c9be] hover:border-[#7B2D3E]"
}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[#1a0a0e]">
                    {option.title}
                  </span>

                  <span
                    className={`h-2.5 w-2.5 rounded-full border ${
                      selected
                        ? "border-[#7B2D3E] bg-[#7B2D3E]"
                        : "border-[#cdbbae]"
                    }`}
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-[#8b7768]">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {savedMessage && (
        <div className="rounded-xl border border-[#7B2D3E]/20 bg-[#7B2D3E]/5 px-4 py-3 text-sm text-[#7B2D3E]">
          {savedMessage}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            try {
              void saveProfile();
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Unable to save your Fit profile."
              );
            }
          }}
          className="rounded-full bg-[#7B2D3E] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#6a2535] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save My Fit"}
        </button>
      </div>
        </div>

    <HowToMeasureDrawer
      open={measureGuideOpen}
      onClose={() => setMeasureGuideOpen(false)}
    />
  </>
);
}
