import type { Prisma } from "@prisma/client";

type MarketingOperation =
  Prisma.ShopperMarketingConsentSyncGetPayload<{
    select: {
      id: true;
      email: true;
      desiredConsent: true;
      reason: true;
      status: true;
      consentVersion: true;
      providerJobId: true;
      lastError: true;
      createdAt: true;
      submittedAt: true;
      lastCheckedAt: true;
    };
  }>;

type Props = {
  operations: MarketingOperation[];
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

export default function ShopperMarketingConsentReview({
  operations,
}: Props) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
      <div className="border-b border-[#e8ddd4] px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-black">
              Shopper marketing consent review
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Review unresolved Klaviyo subscription operations.
              These operations must not be automatically retried.
            </p>
          </div>

          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            {operations.length} unresolved shown
          </span>
        </div>
      </div>

      {operations.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-neutral-500">
          No unresolved shopper marketing operations to review.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#fdf7f4] text-xs uppercase tracking-wide text-[#a89280]">
              <tr>
                <th className="px-5 py-3">Shopper email</th>
                <th className="px-5 py-3">Requested action</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Provider job</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Last checked</th>
              </tr>
            </thead>

            <tbody>
              {operations.map((operation) => (
                <tr
                  key={operation.id}
                  className="border-t border-black/5 align-top"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-black">
                      {operation.email}
                    </div>
                    <div className="mt-1 break-all font-mono text-xs text-neutral-500">
                      {operation.id}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {operation.desiredConsent
                      ? "Subscribe"
                      : "Unsubscribe"}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      {operation.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-neutral-600">
                    <div>{operation.reason}</div>
                    {operation.lastError && (
                      <div className="mt-2 text-xs text-red-700">
                        {operation.lastError}
                      </div>
                    )}
                  </td>

                  <td className="break-all px-5 py-4 font-mono text-xs text-neutral-600">
                    {operation.providerJobId ?? "Not recorded"}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-neutral-600">
                    {formatDate(operation.createdAt)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-neutral-600">
                    {formatDate(operation.lastCheckedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-[#e8ddd4] bg-[#fdfbf9] px-6 py-4 text-xs text-neutral-500">
        Read-only review. No provider requests, retries or consent
        changes can be initiated from this section.
      </div>
    </section>
  );
}