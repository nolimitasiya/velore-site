import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FeedbackStatusControl from "@/components/admin/FeedbackStatusControl";
import FeedbackEmailStatus from "@/components/admin/FeedbackEmailStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FeedbackTab = "ISSUE" | "IDEA";
const PAGE_SIZE = 20;
const ISSUE_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "RESOLVED",
  "DISMISSED",
] as const;

const IDEA_STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "IMPLEMENTED",
  "DISMISSED",
] as const;

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type PageProps = {
  searchParams: Promise<{
    tab?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function AdminFeedbackPage({
  searchParams,
}: PageProps) {

const params = await searchParams;

const activeTab: FeedbackTab =
  params.tab === "IDEA" ? "IDEA" : "ISSUE";

const availableStatuses: readonly string[] =
  activeTab === "ISSUE"
    ? ISSUE_STATUSES
    : IDEA_STATUSES;

const activeStatus =
  typeof params.status === "string" &&
  availableStatuses.includes(params.status)
    ? params.status
    : "ALL";

const requestedPage = Number(params.page ?? "1");

const currentPage =
  Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;

  const [issueCount, ideaCount, filteredCount] =
    await Promise.all([
      prisma.feedbackSubmission.count({
        where: { type: "ISSUE" },
      }),

      prisma.feedbackSubmission.count({
        where: { type: "IDEA" },
      }),

prisma.feedbackSubmission.count({
  where: {
    type: activeTab,
    ...(activeStatus !== "ALL"
      ? {
          status: activeStatus as
            | "NEW"
            | "IN_PROGRESS"
            | "RESOLVED"
            | "UNDER_REVIEW"
            | "IMPLEMENTED"
            | "DISMISSED",
        }
      : {}),
  },
}),
    ]);

    const totalPages = Math.max(
  1,
  Math.ceil(filteredCount / PAGE_SIZE)
);

const safePage = Math.min(currentPage, totalPages);

const submissions = await prisma.feedbackSubmission.findMany({
  where: {
    type: activeTab,
    ...(activeStatus !== "ALL"
      ? {
          status: activeStatus as
            | "NEW"
            | "IN_PROGRESS"
            | "RESOLVED"
            | "UNDER_REVIEW"
            | "IMPLEMENTED"
            | "DISMISSED",
        }
      : {}),
  },

  orderBy: [
    { createdAt: "desc" },
    { id: "desc" },
  ],

  skip: (safePage - 1) * PAGE_SIZE,
  take: PAGE_SIZE,

  select: {
    id: true,
    type: true,
    category: true,
    message: true,
    status: true,
    contactName: true,
    contactEmail: true,
    productTitleSnapshot: true,
    brandNameSnapshot: true,
    pageUrl: true,
    adminEmailStatus: true,
    adminEmailAttempts: true,
    adminEmailNextAttemptAt: true,
    shopperEmailStatus: true,
    shopperEmailAttempts: true,
    shopperEmailNextAttemptAt: true,
    createdAt: true,
  },
});

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a89280]">
          Operations
        </p>

        <h1 className="mt-2 font-heading text-4xl text-[#7B2D3E]">
          Feedback
        </h1>

        <p className="mt-3 text-sm text-[#8c7569]">
          Review shopper reports and ideas to improve
          the Veilora Club experience.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#e8ddd4] bg-white p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[#a89280]">
            Reported Issues
          </p>

          <p className="mt-3 font-heading text-4xl text-[#7B2D3E]">
            {issueCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e8ddd4] bg-white p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[#a89280]">
            Shared Ideas
          </p>

          <p className="mt-3 font-heading text-4xl text-[#7B2D3E]">
            {ideaCount}
          </p>
        </div>
      </div>

      <div className="flex gap-3 border-b border-[#e8ddd4]">
        {[
          { type: "ISSUE", label: "Report an Issue" },
          { type: "IDEA", label: "Share an Idea" },
        ].map((tab) => {
          const active = activeTab === tab.type;

          return (
            <Link
              key={tab.type}
              href={`/admin/feedback?tab=${tab.type}`}
              className={[
                "border-b-2 px-4 py-3 text-sm transition",
                active
                  ? "border-[#7B2D3E] font-medium text-[#7B2D3E]"
                  : "border-transparent text-[#9a7e6f] hover:text-[#7B2D3E]",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="space-y-4">
  <div className="flex flex-wrap gap-2">
    {["ALL", ...availableStatuses].map((status) => {
      const selected = activeStatus === status;

      return (
        <Link
          key={status}
          href={`/admin/feedback?tab=${activeTab}&status=${status}`}
          className={[
            "rounded-full border px-4 py-2 text-xs font-medium transition",
            selected
              ? "border-[#7B2D3E] bg-[#7B2D3E] text-white"
              : "border-[#e8ddd4] bg-white text-[#9a7e6f] hover:border-[#7B2D3E] hover:text-[#7B2D3E]",
          ].join(" ")}
        >
          {status === "ALL" ? "All" : formatStatus(status)}
        </Link>
      );
    })}
  </div>

  {submissions.length === 0 ? (
  <div className="rounded-2xl border border-[#e8ddd4] bg-white px-6 py-16 text-center">
    <p className="font-heading text-2xl text-[#7B2D3E]">
      No feedback found
    </p>

    <p className="mt-2 text-sm text-[#8c7569]">
      There are no submissions matching the selected filters.
    </p>
  </div>
) : (
  submissions.map((submission) => (
            <article
              key={submission.id}
              className="rounded-2xl border border-[#e8ddd4] bg-white p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[#a89280]">
                    {submission.category ??
                      (submission.type === "IDEA"
                        ? "Shopper Idea"
                        : "Issue")}
                  </p>

                  <p className="mt-1 text-xs text-[#9a7e6f]">
                    {submission.createdAt.toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/London",
                    })}
                  </p>
                </div>

                <FeedbackStatusControl
                feedbackId={submission.id}
                type={submission.type}
                currentStatus={submission.status}
                />
              </div>

              <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-[#34262a]">
                {submission.message}
              </p>

              <div className="mt-5 grid gap-3 border-t border-[#eee5dd] pt-5 text-xs text-[#8c7569] sm:grid-cols-2">
                <p>
                  <strong>Shopper:</strong>{" "}
                  {submission.contactName ?? "Not provided"}
                </p>

                <p>
                  <strong>Email:</strong>{" "}
                  {submission.contactEmail ?? "Not provided"}
                </p>

                {submission.productTitleSnapshot && (
                  <p>
                    <strong>Product:</strong>{" "}
                    {submission.productTitleSnapshot}
                  </p>
                )}

                {submission.brandNameSnapshot && (
                  <p>
                    <strong>Brand:</strong>{" "}
                    {submission.brandNameSnapshot}
                  </p>
                )}

                <FeedbackEmailStatus
  label="Admin email"
  status={submission.adminEmailStatus}
  attempts={submission.adminEmailAttempts}
  nextAttemptAt={submission.adminEmailNextAttemptAt}
/>

<FeedbackEmailStatus
  label="Shopper email"
  status={submission.shopperEmailStatus}
  attempts={submission.shopperEmailAttempts}
  nextAttemptAt={submission.shopperEmailNextAttemptAt}
/>
              </div>

              {submission.pageUrl && (
                <p className="mt-4 break-all text-xs text-[#9a7e6f]">
                  <strong>Page:</strong> {submission.pageUrl}
                </p>
              )}
            </article>
                    ))
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e8ddd4] pt-5">
          <p className="text-xs text-[#8c7569]">
            {filteredCount}{" "}
            {filteredCount === 1 ? "submission" : "submissions"}
            {" · "}
            Page {safePage} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            {safePage > 1 ? (
              <Link
                href={`/admin/feedback?tab=${activeTab}&status=${activeStatus}&page=${safePage - 1}`}
                className="rounded-lg border border-[#e8ddd4] bg-white px-4 py-2 text-xs font-medium text-[#7B2D3E] hover:bg-[#f2ece4]"
              >
                Previous
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-[#e8ddd4] px-4 py-2 text-xs text-[#c4a898]">
                Previous
              </span>
            )}

            {safePage < totalPages ? (
              <Link
                href={`/admin/feedback?tab=${activeTab}&status=${activeStatus}&page=${safePage + 1}`}
                className="rounded-lg border border-[#e8ddd4] bg-white px-4 py-2 text-xs font-medium text-[#7B2D3E] hover:bg-[#f2ece4]"
              >
                Next
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-[#e8ddd4] px-4 py-2 text-xs text-[#c4a898]">
                Next
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}