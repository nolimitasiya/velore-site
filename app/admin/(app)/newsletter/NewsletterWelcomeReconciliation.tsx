"use client";

import { Fragment, useState } from "react";
import type { Prisma } from "@prisma/client";
import NewsletterWelcomeReconciliationForm from "./NewsletterWelcomeReconciliationForm";

type WelcomeEvent = Prisma.NewsletterWelcomeEventGetPayload<{
  select: {
    id: true;
    eventKey: true;
    status: true;
    createdAt: true;
    updatedAt: true;
    submittedAt: true;
    providerMessageId: true;
    subscriber: {
      select: {
        email: true;
      };
    };
    _count: {
      select: {
        reconciliationAudits: true;
      };
    };
  };
}>;

type Props = {
  events: WelcomeEvent[];
};

function formatDate(value: Date | null) {
  return value
    ? value.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      })
    : "Not recorded";
}

export default function NewsletterWelcomeReconciliation({
  events,
}: Props) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  return (
    <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-[#e8ddd4] px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-black">
              Welcome email reconciliation
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Review welcome emails with uncertain provider outcomes.
              These events must not be automatically resent.
            </p>
          </div>

          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            {events.length} unresolved shown
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-neutral-500">
          No UNKNOWN welcome events to review.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-[#fdf7f4] text-xs uppercase tracking-wide text-[#a89280]">
              <tr>
                <th className="px-5 py-3 font-medium">Subscriber</th>
                <th className="px-5 py-3 font-medium">Event identifiers</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
                <th className="px-5 py-3 font-medium">Provider ID</th>
                <th className="px-5 py-3 font-medium">Audits</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {events.map((event) => (
                <Fragment key={event.id}>
                <tr
                  className="border-t border-black/5 align-top hover:bg-[#fdf7f4]"
                >
                  <td className="px-5 py-4 font-medium text-black">
                    {event.subscriber.email}
                  </td>

                  <td className="px-5 py-4">
                    <div className="space-y-1 break-all font-mono text-xs text-neutral-600">
                      <div>Event: {event.id}</div>
                      <div>Key: {event.eventKey}</div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      {event.status}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-neutral-600">
                    {formatDate(event.createdAt)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-neutral-600">
                    {formatDate(event.submittedAt)}
                  </td>

                  <td className="break-all px-5 py-4 font-mono text-xs text-neutral-600">
                    {event.providerMessageId ?? "Not recorded"}
                  </td>

                  <td className="px-5 py-4 text-neutral-600">
                    {event._count.reconciliationAudits}
                  </td>

                  <td className="px-5 py-4">
                    <button
                      type="button"
                      aria-expanded={expandedEventId === event.id}
                      aria-controls={`reconciliation-form-${event.id}`}
                      onClick={() =>
                        setExpandedEventId((current) =>
                          current === event.id ? null : event.id
                        )
                      }
                      className="whitespace-nowrap rounded-xl border border-[#7B2D3E]/20 px-3 py-2 text-xs font-semibold text-[#7B2D3E] transition hover:bg-[#fdf7f4]"
                    >
                      {expandedEventId === event.id
                        ? "Close review"
                        : "Review evidence"}
                    </button>
                  </td>
                </tr>

                {expandedEventId === event.id && (
                  <tr className="border-t border-[#7B2D3E]/10">
                    <td colSpan={8} className="px-5 py-5">
                      <div id={`reconciliation-form-${event.id}`}>
                        <NewsletterWelcomeReconciliationForm
                          eventId={event.id}
                          eventKey={event.eventKey}
                        />
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-[#e8ddd4] bg-[#fdfbf9] px-6 py-4 text-xs leading-5 text-neutral-500">
        Read-only monitoring. Provider evidence must be reviewed before
        any reconciliation decision is recorded.
      </div>
    </section>
  );
}