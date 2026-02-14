// C:\Users\Asiya\projects\dalra\app\admin\brands\applications\StatusSelect.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useId, useRef } from "react";

const OPTIONS = [
  "new",
  "contacted",
  "invited",
  "contract_sent",
  "contract_signed",
  "onboarded",
  "rejected",
];

async function uploadContract(args: { applicationId: string; kind: "sent" | "signed"; file: File }) {
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
  if (!res.ok || !j.ok) throw new Error(j?.error ?? `Upload failed (${res.status})`);
  return j.path as string;
}

export default function StatusSelect({ id, value }: { id: string; value: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const labelId = useId();

  // hidden file inputs so we can trigger file picker
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

      // Invited => optional booking link
      if (next === "invited") {
        schedulerUrl =
          window
            .prompt(
              "Optional: paste your booking link (Calendly/Cal.com). Leave blank to send a reply-based email."
            )
            ?.trim() || "";
        schedulerUrl = schedulerUrl || undefined;
      }

      // Onboarded => require invite link
      if (next === "onboarded") {
        inviteLink =
          window
            .prompt("Paste the brand invite/onboarding link to include in the email (required):")
            ?.trim() || "";
        if (!inviteLink) return;
      }

      // contract_sent => MUST upload PDF first
      if (next === "contract_sent") {
        // open file picker
        sentInputRef.current?.click();
        return; // the actual PATCH happens in onSentFileChosen
      }

      // contract_signed => allow manual mark, OR upload signed PDF
      if (next === "contract_signed") {
        const wantsUpload =
          window.confirm("Do you want to upload the signed PDF now?\n\nOK = upload, Cancel = mark signed without upload.");
        if (wantsUpload) {
          signedInputRef.current?.click();
          return; // PATCH happens in onSignedFileChosen
        }
        // manual mark signed
        await patchStatus({ status: next });
        router.refresh();
        return;
      }

      // Normal statuses
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
      const path = await uploadContract({ applicationId: id, kind: "sent", file });
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
      const path = await uploadContract({ applicationId: id, kind: "signed", file });
      await patchStatus({ status: "contract_signed", contractSignedPath: path });
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
  <div className="flex items-center gap-2">
    <span id={labelId} className="sr-only">Application stage</span>

    {/* hidden upload inputs */}
    <label htmlFor="contractSentFile" className="sr-only">
      Upload contract PDF (sent)
    </label>
    <input
      id="contractSentFile"
      ref={sentInputRef}
      type="file"
      accept="application/pdf"
      className="hidden"
      aria-label="Upload contract PDF (sent)"
      onChange={(e) => onSentFileChosen(e.target.files?.[0] ?? null)}
    />

    <label htmlFor="contractSignedFile" className="sr-only">
      Upload signed contract PDF
    </label>
    <input
      id="contractSignedFile"
      ref={signedInputRef}
      type="file"
      accept="application/pdf"
      className="hidden"
      aria-label="Upload signed contract PDF"
      onChange={(e) => onSignedFileChosen(e.target.files?.[0] ?? null)}
    />

    <select
      aria-labelledby={labelId}
      className="rounded-xl border px-2 py-1 text-sm bg-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
    >
      {OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s.toUpperCase()}
        </option>
      ))}
    </select>

    {loading && <span className="text-xs text-neutral-500">Saving…</span>}
  </div>
);
}