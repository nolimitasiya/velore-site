type EmailStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "NOT_APPLICABLE";

type Props = {
  label: string;
  status: EmailStatus;
  attempts: number;
  nextAttemptAt: Date | null;
};

const MAX_ATTEMPTS = 5;

export default function FeedbackEmailStatus({
  label,
  status,
  attempts,
  nextAttemptAt,
}: Props) {
  const exhausted =
    status === "FAILED" && attempts >= MAX_ATTEMPTS;

  const styles: Record<EmailStatus, string> = {
    SENT: "bg-green-50 text-green-700",
    PENDING: "bg-amber-50 text-amber-700",
    PROCESSING: "bg-blue-50 text-blue-700",
    FAILED: "bg-red-50 text-red-700",
    NOT_APPLICABLE: "bg-gray-100 text-gray-500",
  };

  const displayStatus = exhausted
    ? "Failed — retries exhausted"
    : status === "FAILED" && nextAttemptAt
      ? "Failed — retry scheduled"
      : status
          .toLowerCase()
          .replaceAll("_", " ");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium text-[#8c7569]">
        {label}:
      </span>

      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${styles[status]}`}
      >
        {displayStatus}
      </span>

      {status === "FAILED" &&
        nextAttemptAt &&
        !exhausted && (
          <span className="text-[11px] text-[#9a7e6f]">
            Next retry:{" "}
            {nextAttemptAt.toLocaleString("en-GB", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/London",
            })}
          </span>
        )}
    </div>
  );
}