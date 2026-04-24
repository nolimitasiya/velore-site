"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

const OPTIONS = [
  "new",
  "contacted",
  "invited",
  "contract_sent",
  "contract_signed",
  "onboarded",
  "rejected",
] as const;

async function uploadContract(args: {
  applicationId: string;
  kind: "sent" | "signed";
  file: File;
}) {
  const form = new FormData();
  form.append("file", args.file);

  const res = await fetch(
    `/api/admin/brand-applications/${args.applicationId}/contract/upload?kind=${args.kind}`,
    {
      method: "POST",
      body: form,
    }
  );

  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) {
    throw new Error(j?.error ?? `Upload failed (${res.status})`);
  }
  return j.path as string;
}

export default function StatusSelect({
  id,
  value,
}: {
  id: string;
  value: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const labelId = useId();

  const sentInputRef = useRef<HTMLInputElement | null>(null);
  const signedInputRef = useRef<HTMLInputElement | null>(null);

  async function patchStatus(payload: any) {
    const res = await fetch(`/api/admin/brand-applications/${id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed (${res.status})`);
    }
  }

  async function onChange(next: string) {
    setLoading(true);

    try {
      let schedulerUrl: string | undefined;
      let inviteLink: string | undefined;

      if (next === "invited") {
        schedulerUrl =
          window
            .prompt(
              "Optional: paste your booking link (Calendly/Cal.com). Leave blank to send a reply-based email."
            )
            ?.trim() || "";
        schedulerUrl = schedulerUrl || undefined;
      }

      if (next === "onboarded") {
        const ok = window.confirm(
          "This will create or update the Brand, generate an onboarding invite, email it to the applicant, and mark the application as ONBOARDED.\n\nContinue?"
        );
        if (!ok) return;

        const res = await fetch(`/api/admin/brand-applications/${id}/invite`, {
          method: "POST",
        });

        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) {
          throw new Error(j?.error || `Failed (${res.status})`);
        }

        if (j.onboardingUrl) {
          window.prompt("Onboarding link (copy):", j.onboardingUrl);
        }

        router.refresh();
        return;
      }

      if (next === "contract_sent") {
        sentInputRef.current?.click();
        return;
      }

      if (next === "contract_signed") {
        const wantsUpload = window.confirm(
          "Do you want to upload the signed PDF now?\n\nOK = upload, Cancel = mark signed without upload."
        );

        if (wantsUpload) {
          signedInputRef.current?.click();
          return;
        }

        await patchStatus({ status: next });
        router.refresh();
        return;
      }

      await patchStatus({ status: next, schedulerUrl, inviteLink });
      router.refresh();
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update status. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  async function onSentFileChosen(file: File | null) {
    if (!file) return;

    setLoading(true);
    try {
      const path = await uploadContract({
        applicationId: id,
        kind: "sent",
        file,
      });
      await patchStatus({ status: "contract_sent", contractSentPath: path });
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Contract upload failed. Check console for details.");
    } finally {
      setLoading(false);
      if (sentInputRef.current) sentInputRef.current.value = "";
    }
  }

  async function onSignedFileChosen(file: File | null) {
    if (!file) return;

    setLoading(true);
    try {
      const path = await uploadContract({
        applicationId: id,
        kind: "signed",
        file,
      });
      await patchStatus({
        status: "contract_signed",
        contractSignedPath: path,
      });
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Signed contract upload failed. Check console for details.");
    } finally {
      setLoading(false);
      if (signedInputRef.current) signedInputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span id={labelId} className="sr-only">
        Application stage
      </span>

      <label htmlFor={`contractSentFile-${id}`} className="sr-only">
        Upload contract PDF (sent)
      </label>
      <input
        id={`contractSentFile-${id}`}
        ref={sentInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        aria-label="Upload contract PDF (sent)"
        onChange={(e) => onSentFileChosen(e.target.files?.[0] ?? null)}
      />

      <label htmlFor={`contractSignedFile-${id}`} className="sr-only">
        Upload signed contract PDF
      </label>
      <input
        id={`contractSignedFile-${id}`}
        ref={signedInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        aria-label="Upload signed contract PDF"
        onChange={(e) => onSignedFileChosen(e.target.files?.[0] ?? null)}
      />

      <div className="relative">
        <select
          aria-labelledby={labelId}
          className="h-10 rounded-2xl border border-black/10 bg-white px-3 pr-9 text-sm font-medium text-neutral-800 outline-none transition hover:border-black/20 focus:border-black/20 focus:ring-2 focus:ring-black/5 disabled:cursor-not-allowed disabled:opacity-60"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
        >
          {OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ").toUpperCase()}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {loading ? (
        <span className="inline-flex items-center rounded-full border border-black/10 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-500">
          Saving…
        </span>
      ) : null}
    </div>
  );
}