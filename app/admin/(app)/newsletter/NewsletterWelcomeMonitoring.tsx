import type { NewsletterWelcomeMonitoringSummary } from "@/lib/marketing/getNewsletterWelcomeMonitoringSummary";

type Props = {
  summary: NewsletterWelcomeMonitoringSummary;
};

function formatDate(value: Date | null): string {
  if (!value) {
    return "None";
  }

  return value.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export default function NewsletterWelcomeMonitoring({
  summary,
}: Props) {
  const {
    unknownCount,
    staleProcessingCount,
    staleSubmittingCount,
    oldestUnresolvedCreatedAt,
    requiresManualReconciliation,
  } = summary;

  const metrics = [
    {
      label: "UNKNOWN",
      value: unknownCount,
      description: "Provider outcome requires evidence review.",
    },
    {
      label: "Stale PROCESSING",
      value: staleProcessingCount,
      description: "Processing claim older than 30 minutes.",
    },
    {
      label: "Stale SUBMITTING",
      value: staleSubmittingCount,
      description: "Submission claim older than 30 minutes.",
    },
  ];

  return (
    <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/60">
            Newsletter operations
          </p>

          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#7B2D3E]">
            Welcome email monitoring
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Read-only monitoring of unresolved newsletter welcome-email
            events. Stale claims use a 30-minute monitoring threshold.
          </p>
        </div>

        <div
          className={
            requiresManualReconciliation
              ? "rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800"
              : "rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800"
          }
        >
          {requiresManualReconciliation
            ? "Investigation required"
            : "No unresolved events detected"}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-[#7B2D3E]/10 bg-[#fdf7f4] p-5"
          >
            <div className="text-xs font-medium text-neutral-600">
              {metric.label}
            </div>

            <div className="mt-2 text-3xl font-semibold text-[#7B2D3E]">
              {metric.value}
            </div>

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              {metric.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4">
        <div className="text-xs font-medium text-neutral-500">
          Oldest unresolved event
        </div>

        <div className="mt-1 text-sm font-semibold text-neutral-800">
          {formatDate(oldestUnresolvedCreatedAt)}
        </div>

        {oldestUnresolvedCreatedAt && (
          <p className="mt-1 text-xs text-neutral-500">
            Date and time shown in UTC.
          </p>
        )}
      </div>

      <p className="mt-5 text-xs leading-5 text-neutral-500">
        Monitoring does not recover claims, contact the email provider,
        reconcile events, or resend welcome emails. UNKNOWN events require
        provider evidence review before an administrative decision.
      </p>
    </section>
  );
}