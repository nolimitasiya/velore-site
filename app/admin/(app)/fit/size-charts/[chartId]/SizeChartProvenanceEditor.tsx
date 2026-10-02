"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  chartId: string;
  source: string;
  initialSourceUrl: string;
  initialSourceNotes: string;
  initialLastVerifiedAt: string;
};

function formatSource(value: string) {
  if (value === "BRAND_WEBSITE") return "Brand website";
  if (value === "BRAND_PORTAL") return "Brand portal";
  if (value === "ADMIN") return "Admin";

  return value;
}

export default function SizeChartProvenanceEditor({
  chartId,
  source,
  initialSourceUrl,
  initialSourceNotes,
  initialLastVerifiedAt,
}: Props) {
  const router = useRouter();

  const [sourceUrl, setSourceUrl] =
    useState(initialSourceUrl);

  const [sourceNotes, setSourceNotes] =
    useState(initialSourceNotes);

  const [lastVerifiedAt, setLastVerifiedAt] =
    useState(initialLastVerifiedAt);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/fit/size-charts/${chartId}/provenance`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceUrl,
            sourceNotes,
            lastVerifiedAt,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Unable to save provenance."
        );
      }

      setSuccess("Provenance saved.");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save provenance."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-7">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
        Provenance
      </div>

      <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
        Source &amp; verification
      </h2>

      <div className="mt-5 space-y-5">
        <div>
          <div className="text-xs font-medium text-neutral-400">
            Data source
          </div>

          <div className="mt-1 text-sm font-medium text-neutral-700">
            {formatSource(source)}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-400">
            Last verified
          </label>

          <input
            type="date"
            value={lastVerifiedAt}
            onChange={(event) =>
              setLastVerifiedAt(event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none transition focus:border-[#7B2D3E]/50"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-400">
            Source URL
          </label>

          <input
            type="url"
            value={sourceUrl}
            onChange={(event) =>
              setSourceUrl(event.target.value)
            }
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none transition focus:border-[#7B2D3E]/50"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-400">
            Source notes
          </label>

          <textarea
            value={sourceNotes}
            onChange={(event) =>
              setSourceNotes(event.target.value)
            }
            rows={4}
            placeholder="Preserve sizing guidance, tolerances or notes supplied by the source."
            className="mt-2 w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm leading-6 text-neutral-700 outline-none transition focus:border-[#7B2D3E]/50"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-400">
            Preserve source guidance separately from the
            measurement values.
          </p>
        </div>

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

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-[#7B2D3E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#682635] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save provenance"}
        </button>
      </div>
    </div>
  );
}