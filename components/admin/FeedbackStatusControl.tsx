"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FeedbackType = "ISSUE" | "IDEA";

type FeedbackStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "UNDER_REVIEW"
  | "IMPLEMENTED"
  | "DISMISSED";

type Props = {
  feedbackId: string;
  type: FeedbackType;
  currentStatus: FeedbackStatus;
};

const ISSUE_STATUSES: FeedbackStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "RESOLVED",
  "DISMISSED",
];

const IDEA_STATUSES: FeedbackStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "IMPLEMENTED",
  "DISMISSED",
];

function formatStatus(status: FeedbackStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function FeedbackStatusControl({
  feedbackId,
  type,
  currentStatus,
}: Props) {
  const router = useRouter();

  const [selectedStatus, setSelectedStatus] =
    useState<FeedbackStatus>(currentStatus);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableStatuses =
    type === "ISSUE" ? ISSUE_STATUSES : IDEA_STATUSES;

  async function saveStatus() {
    if (saving || selectedStatus === currentStatus) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/feedback/${encodeURIComponent(feedbackId)}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            status: selectedStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to update feedback status.");
      }

      router.refresh();
    } catch {
      setError("Status update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={`feedback-status-${feedbackId}`}
          className="sr-only"
        >
          Feedback status
        </label>

        <select
          id={`feedback-status-${feedbackId}`}
          value={selectedStatus}
          onChange={(event) => {
            setSelectedStatus(
              event.target.value as FeedbackStatus
            );
            setError(null);
          }}
          disabled={saving}
          className="rounded-lg border border-[#e8ddd4] bg-white px-3 py-2 text-xs text-[#7B2D3E] focus:outline-none focus:ring-2 focus:ring-[#7B2D3E]"
        >
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={saveStatus}
          disabled={saving || selectedStatus === currentStatus}
          className="rounded-lg bg-[#7B2D3E] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#612332] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}