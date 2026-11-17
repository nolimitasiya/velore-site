"use client";

import { useState } from "react";

import {
  validateNewsletterWelcomeReconciliationForm,
  type NewsletterWelcomeEvidenceOutcome,
} from "@/lib/marketing/validateNewsletterWelcomeReconciliationForm";

type Props = {
  eventId: string;
  eventKey: string;
};

const outcomes: {
  value: NewsletterWelcomeEvidenceOutcome;
  label: string;
  description: string;
}[] = [
  {
    value: "UNCERTAIN",
    label: "Uncertain",
    description: "Provider outcome cannot be established.",
  },
  {
    value: "CONFLICTING",
    label: "Conflicting",
    description: "Available provider evidence is inconsistent.",
  },
  {
    value: "ACCEPTED",
    label: "Accepted",
    description: "Provider acceptance independently confirmed.",
  },
  {
    value: "NOT_ACCEPTED",
    label: "Not accepted",
    description: "Definitive evidence that the provider did not accept submission.",
  },
];

export default function NewsletterWelcomeReconciliationForm({
  eventId,
  eventKey,
}: Props) {
  const [outcome, setOutcome] =
    useState<NewsletterWelcomeEvidenceOutcome>("UNCERTAIN");

  const [evidenceReference, setEvidenceReference] = useState("");
  const [reason, setReason] = useState("");
  const [providerMessageId, setProviderMessageId] = useState("");
  const [evidenceReviewed, setEvidenceReviewed] = useState(false);

  const [error, setError] = useState("");
  const [validated, setValidated] = useState(false);

  function validateForm() {
    setError("");
    setValidated(false);

    if (!evidenceReviewed) {
      setError(
        "Confirm that you have independently reviewed the provider evidence."
      );
      return;
    }

    const result = validateNewsletterWelcomeReconciliationForm({
      eventId,
      evidenceReference,
      reason,
      outcome,
      providerMessageId,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setValidated(true);
  }

  function resetValidation() {
    setValidated(false);
    setError("");
  }

  return (
    <div className="space-y-5 rounded-2xl border border-[#7B2D3E]/15 bg-[#fdf7f4] p-5">
      <div>
        <h3 className="text-sm font-semibold text-[#7B2D3E]">
          Prepare reconciliation evidence
        </h3>

        <p className="mt-1 text-xs leading-5 text-neutral-600">
          This form validates evidence details only. It does not submit a
          reconciliation decision or send an email.
        </p>
      </div>

      <div className="space-y-1 text-xs text-neutral-600">
        <p className="break-all">
          <span className="font-semibold">Event ID:</span> {eventId}
        </p>

        <p className="break-all">
          <span className="font-semibold">Event key:</span> {eventKey}
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={`outcome-${eventId}`}
          className="block text-xs font-semibold text-neutral-700"
        >
          Provider evidence outcome
        </label>

        <select
          id={`outcome-${eventId}`}
          value={outcome}
          onChange={(event) => {
            setOutcome(
              event.target.value as NewsletterWelcomeEvidenceOutcome
            );
            resetValidation();
          }}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          {outcomes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <p className="text-xs text-neutral-500">
          {outcomes.find((option) => option.value === outcome)?.description}
        </p>
      </div>

      <div>
        <label
          htmlFor={`reference-${eventId}`}
          className="mb-2 block text-xs font-semibold text-neutral-700"
        >
          Evidence reference
        </label>

        <input
          id={`reference-${eventId}`}
          type="text"
          maxLength={500}
          value={evidenceReference}
          onChange={(event) => {
            setEvidenceReference(event.target.value);
            resetValidation();
          }}
          placeholder="Provider record or investigation reference"
          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {outcome === "ACCEPTED" && (
        <div>
          <label
            htmlFor={`provider-${eventId}`}
            className="mb-2 block text-xs font-semibold text-neutral-700"
          >
            Verified provider message ID
          </label>

          <input
            id={`provider-${eventId}`}
            type="text"
            maxLength={500}
            value={providerMessageId}
            onChange={(event) => {
              setProviderMessageId(event.target.value);
              resetValidation();
            }}
            placeholder="Provider message ID"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label
          htmlFor={`reason-${eventId}`}
          className="mb-2 block text-xs font-semibold text-neutral-700"
        >
          Investigation notes
        </label>

        <textarea
          id={`reason-${eventId}`}
          maxLength={2000}
          rows={4}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            resetValidation();
          }}
          placeholder="Explain the evidence reviewed and how the outcome was determined."
          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-start gap-3 text-xs leading-5 text-neutral-700">
        <input
          type="checkbox"
          checked={evidenceReviewed}
          onChange={(event) => {
            setEvidenceReviewed(event.target.checked);
            resetValidation();
          }}
          className="mt-1"
        />

        <span>
          I confirm that I have independently reviewed the provider
          evidence and understand that an attempted submission alone
          does not prove provider acceptance.
        </span>
      </label>

      {error && (
        <p role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      {validated && (
        <p role="status" className="text-xs font-medium text-emerald-800">
          Form validation passed. No reconciliation decision has been
          submitted or recorded.
        </p>
      )}

      <button
        type="button"
        onClick={validateForm}
        className="rounded-xl bg-[#7B2D3E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#6a2435]"
      >
        Validate evidence details
      </button>

      <p className="text-xs leading-5 text-neutral-500">
        Validation does not verify provider records. No API request,
        database update, recovery operation or email submission occurs.
      </p>
    </div>
  );
}