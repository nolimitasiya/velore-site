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

type PendingStatus = (typeof OPTIONS)[number];

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

function label(status: string) {
  return status.replaceAll("_", " ").toUpperCase();
}

export default function StatusSelect({
  id,
  value,
}: {
  id: string;
  value: string;
}) {
  const router = useRouter();
  const labelId = useId();

  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<PendingStatus | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [schedulerUrl, setSchedulerUrl] = useState("");

  const [rejectionSubject, setRejectionSubject] = useState(
    "Your Veilora Club brand application"
  );
  const [rejectionMessage, setRejectionMessage] = useState(
    `Hi,

Thank you so much for applying to Veilora Club.

After reviewing your application, we are unable to move forward at this stage.

Reason:
[Add your reason here]

We truly appreciate your interest and wish you all the best with your brand.

Kind regards,
Asiya
Veilora Club`
  );

  const sentInputRef = useRef<HTMLInputElement | null>(null);
  const signedInputRef = useRef<HTMLInputElement | null>(null);

  async function patchStatus(payload: any) {
    const res = await fetch(`/api/admin/brand-applications/${id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const j = await res.json().catch(() => ({}));

    if (!res.ok || !j.ok) {
      throw new Error(j?.error || `Failed (${res.status})`);
    }
  }

  function openModal(next: string) {
    if (next === value) return;

    if (!OPTIONS.includes(next as PendingStatus)) return;

    setPendingStatus(next as PendingStatus);
    setSendEmail(!["new", "contacted"].includes(next));
    setSchedulerUrl("");
  }

  function closeModal() {
    if (loading) return;
    setPendingStatus(null);
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return;

    setLoading(true);

    try {
      if (pendingStatus === "onboarded") {
        const res = await fetch(`/api/admin/brand-applications/${id}/invite`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sendEmail }),
        });

        const j = await res.json().catch(() => ({}));

        if (!res.ok || !j.ok) {
          throw new Error(j?.error || `Failed (${res.status})`);
        }

        if (j.onboardingUrl) {
          window.prompt("Onboarding link copy:", j.onboardingUrl);
        }

        setPendingStatus(null);
        router.refresh();
        return;
      }

      if (pendingStatus === "contract_sent") {
        setPendingStatus(null);
        sentInputRef.current?.click();
        return;
      }

      if (pendingStatus === "contract_signed") {
        await patchStatus({
          status: "contract_signed",
          sendEmail,
        });

        setPendingStatus(null);
        router.refresh();
        return;
      }

      await patchStatus({
        status: pendingStatus,
        sendEmail,
        schedulerUrl: schedulerUrl.trim() || undefined,
        emailSubject:
          pendingStatus === "rejected" ? rejectionSubject.trim() : undefined,
        emailText:
          pendingStatus === "rejected" ? rejectionMessage.trim() : undefined,
      });

      setPendingStatus(null);
      router.refresh();
    } catch (e: any) {
      console.error("Failed to update status", e);
      alert(e?.message ?? "Failed to update status.");
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

      await patchStatus({
        status: "contract_sent",
        contractSentPath: path,
        sendEmail,
      });

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
        sendEmail,
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

  const modalTitle = pendingStatus
    ? `Change status to ${label(pendingStatus)}`
    : "";

  return (
    <>
      <div className="flex items-center gap-3">
        <span id={labelId} className="sr-only">
          Application stage
        </span>

        <input
          id={`contractSentFile-${id}`}
          ref={sentInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          aria-label="Upload contract PDF sent"
          onChange={(e) => onSentFileChosen(e.target.files?.[0] ?? null)}
        />

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
            onChange={(e) => openModal(e.target.value)}
            disabled={loading}
          >
            {OPTIONS.map((s) => (
              <option key={s} value={s}>
                {label(s)}
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

      {pendingStatus ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Brand application
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">
                  {modalTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Choose whether Veilora should send an email, or update the
                  pipeline status only.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="rounded-full border border-black/10 px-3 py-1 text-sm text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50/80 p-4 text-sm">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="font-medium text-neutral-800">
                Send email from Veilora Club
              </span>
            </label>

            {pendingStatus === "invited" && sendEmail ? (
              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Optional booking link
                </label>
                <input
                  value={schedulerUrl}
                  onChange={(e) => setSchedulerUrl(e.target.value)}
                  placeholder="Calendly / Cal.com link"
                  className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-4 text-sm outline-none focus:border-black/20 focus:ring-2 focus:ring-black/5"
                />
              </div>
            ) : null}

           {pendingStatus === "rejected" && sendEmail ? (
  <div className="mt-4 space-y-4">
    <div>
      <label
        htmlFor={`reject-subject-${id}`}
        className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500"
      >
        Email subject
      </label>
      <input
        id={`reject-subject-${id}`}
        value={rejectionSubject}
        onChange={(e) => setRejectionSubject(e.target.value)}
        className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-4 text-sm outline-none focus:border-black/20 focus:ring-2 focus:ring-black/5"
      />
    </div>

    <div>
      <label
        htmlFor={`reject-message-${id}`}
        className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500"
      >
        Email message
      </label>
      <textarea
        id={`reject-message-${id}`}
        value={rejectionMessage}
        onChange={(e) => setRejectionMessage(e.target.value)}
        rows={10}
        className="mt-2 w-full rounded-2xl border border-black/10 p-4 text-sm leading-6 outline-none focus:border-black/20 focus:ring-2 focus:ring-black/5"
      />
    </div>
  </div>
) : null}

            {pendingStatus === "contract_sent" ? (
              <p className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-900">
                After confirming, you’ll be asked to upload the contract PDF.
                The status will update after the upload completes.
              </p>
            ) : null}

            {pendingStatus === "contract_signed" ? (
              <p className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
                This will mark the contract as signed. If you want to upload the
                signed PDF, use the contract upload flow afterwards.
              </p>
            ) : null}

            {pendingStatus === "onboarded" ? (
              <p className="mt-4 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm leading-6 text-purple-900">
                This will create or update the brand, generate an onboarding
                invite, and mark the application as onboarded.
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-medium text-neutral-700 hover:bg-black/[0.03] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmStatusChange}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-black px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : sendEmail
                  ? "Send email + update"
                  : "Update status only"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}