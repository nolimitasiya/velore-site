"use client";

import { useRef, useState } from "react";
import {
  submitFeedback,
  type FeedbackSubmissionResult,
} from "@/lib/feedback/submitFeedback";
import type { FeedbackShopper } from "@/lib/feedback/getFeedbackShopper";

type Props = {
  onBack: () => void;
  shopper:
    | FeedbackShopper
    | { status: "IDLE" }
    | { status: "LOADING" };
};

export default function FeedbackIdeaForm({
  onBack,
  shopper,
}: Props) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] =
  useState<FeedbackSubmissionResult | null>(null);

  const submissionLock = useRef(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (submissionLock.current || submissionResult?.ok) {
    return;
  }

  if (message.trim().length < 20) {
    setSubmissionResult({
      ok: false,
      error: "Please enter at least 20 characters.",
      status: 400,
    });
    return;
  }

  submissionLock.current = true;
  setIsSubmitting(true);
  setSubmissionResult(null);

  try {
    const result = await submitFeedback({
      type: "IDEA",
      category: null,
      message: message.trim(),
      contactEmail:
        shopper.status === "GUEST"
        ? email.trim() || null
        : null,
     contactName:
       shopper.status === "GUEST"
       ? name.trim() || null
      : null,
      productId: null,
      pageUrl: window.location.href,
    });

    setSubmissionResult(result);
  } catch {
    setSubmissionResult({
      ok: false,
      error: "Something went wrong. Please try again.",
      status: null,
    });
  } finally {
    submissionLock.current = false;
    setIsSubmitting(false);
  }
}

  return (
   <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-medium text-[#7B2D3E] hover:underline"
      >
        ← Back
      </button>

      <div>
        <h2 className="font-display text-2xl text-[#7B2D3E]">
          Share an Idea
        </h2>

        <p className="mt-1 text-xs leading-5 text-[#8c7569]">
          Have an idea for Veilora Club? We'd love to hear it.
        </p>
      </div>

      <div>
        <label
          htmlFor="feedback-idea-message"
          className="mb-2 block text-xs font-medium text-[#5c4641]"
        >
          Tell us your idea *
        </label>

        <textarea
          id="feedback-idea-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          minLength={20}
          maxLength={3000}
          required
          rows={5}
          placeholder="What would you love to see on Veilora Club?"
          className="w-full resize-y rounded-lg border border-[#e8ddd4] bg-white px-3 py-3 text-sm text-[#34262a] outline-none placeholder:text-[#b6a59d] focus:border-[#7B2D3E]"
        />

        <p className="mt-1 text-right text-[11px] text-[#9a7e6f]">
          {message.length}/3000
        </p>
      </div>

      {shopper.status === "AUTHENTICATED" ? (
  <div className="rounded-lg border border-[#e8ddd4] bg-[#fcfbf8] p-4">
    <p className="text-xs font-medium text-[#5c4641]">
      Follow-up contact
    </p>

    {shopper.name && (
      <p className="mt-2 text-sm text-[#34262a]">
        {shopper.name}
      </p>
    )}

    <p className="mt-2 text-sm text-[#34262a]">
      {shopper.email}
    </p>

    <p className="mt-2 text-xs leading-5 text-[#8c7569]">
      We'll use the contact information associated with your
      Veilora Club account if we need to follow up about your idea.
    </p>
  </div>
) : shopper.status === "GUEST" ? (
  <>
    <div>
      <label
        htmlFor="feedback-idea-name"
        className="mb-2 block text-xs font-medium text-[#5c4641]"
      >
        Your name (optional)
      </label>

      <input
        id="feedback-idea-name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={100}
        autoComplete="name"
        placeholder="Your name"
        className="w-full rounded-lg border border-[#e8ddd4] bg-white px-3 py-3 text-sm text-[#34262a] outline-none placeholder:text-[#b6a59d] focus:border-[#7B2D3E]"
      />
    </div>

    <div>
      <label
        htmlFor="feedback-idea-email"
        className="mb-2 block text-xs font-medium text-[#5c4641]"
      >
        Email address (optional)
      </label>

      <input
        id="feedback-idea-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        maxLength={254}
        autoComplete="email"
        placeholder="you@example.com"
        className="w-full rounded-lg border border-[#e8ddd4] bg-white px-3 py-3 text-sm text-[#34262a] outline-none placeholder:text-[#b6a59d] focus:border-[#7B2D3E]"
      />

      <p className="mt-2 text-xs leading-5 text-[#9a7e6f]">
        If you provide an email, we'll use it to follow up
        about your idea.
      </p>
    </div>
  </>
) : (
  <div
    role="status"
    aria-live="polite"
    className="rounded-lg border border-[#e8ddd4] bg-[#fcfbf8] p-4 text-xs leading-5 text-[#8c7569]"
  >
    {shopper.status === "LOADING"
      ? "Checking your account status..."
      : shopper.status === "UNAVAILABLE"
        ? "We couldn't check your account status. Please try again later."
        : "Account information will be available when feedback submissions are enabled."}
  </div>
)}

      <button
  type="submit"
  disabled
  aria-disabled="true"
  className="w-full cursor-not-allowed rounded-lg bg-[#7B2D3E] px-4 py-3 text-sm font-medium text-white opacity-50"
>
  {isSubmitting ? "Submitting..." : "Submit idea"}
</button>
      {submissionResult && (
  <div
    role="status"
    aria-live="polite"
    className={`rounded-lg border px-3 py-3 text-xs leading-5 ${
      submissionResult.ok
        ? "border-green-200 bg-green-50 text-green-800"
        : "border-red-200 bg-red-50 text-red-800"
    }`}
  >
    {submissionResult.ok
      ? submissionResult.message
      : submissionResult.error}
  </div>
)}
      <p className="text-center text-[11px] text-[#9a7e6f]">
        Your current page will be included automatically.
      </p>
        </form>
  );
}