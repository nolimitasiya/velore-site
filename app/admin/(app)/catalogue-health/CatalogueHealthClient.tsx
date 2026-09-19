"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type HealthStatus = "UNKNOWN" | "HEALTHY" | "DEGRADED" | "BROKEN";

type TargetType =
  | "PRODUCT_SOURCE_URL"
  | "PRODUCT_AFFILIATE_URL"
  | "PRODUCT_IMAGE";

type Issue = {
  id: string;
  status: string;
  severity: string;
  failureType: string;
  openedAt: string;
  acknowledgedAt: string | null;
  latestHttpStatus: number | null;
  failureCount: number;
  lastFailureAt: string;
};

type Row = {
  id: string;
  targetType: TargetType;
  status: HealthStatus;
  failureType: string | null;

  url: string;
  finalUrl: string | null;

  httpStatus: number | null;
  contentType: string | null;
  responseTimeMs: number | null;

  consecutiveFailures: number;
  consecutiveSuccesses: number;

  firstCheckedAt: string | null;
  lastCheckedAt: string | null;
  lastHealthyAt: string | null;
  lastFailedAt: string | null;
  nextCheckAt: string | null;

  imageSortOrder: number | null;

  product: {
    id: string;
    title: string;
    slug: string;
    isActive: boolean;
    publishedAt: string | null;
    brand: {
      id: string;
      name: string;
      slug: string;
    };
  } | null;

  issue: Issue | null;
};

function SectionCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {children}
    </div>
  );
}

function statusStyle(status: HealthStatus) {
  switch (status) {
    case "HEALTHY":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "DEGRADED":
      return "border-amber-200 bg-amber-50 text-amber-800";

    case "BROKEN":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-black/10 bg-neutral-100 text-neutral-600";
  }
}

function targetLabel(type: TargetType) {
  switch (type) {
    case "PRODUCT_SOURCE_URL":
      return "Product link";

    case "PRODUCT_AFFILIATE_URL":
      return "Affiliate link";

    case "PRODUCT_IMAGE":
      return "Product image";
  }
}

function failureLabel(value: string | null) {
  if (!value) return "—";

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function hostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

export default function CatalogueHealthClient({
  rows,
}: {
  rows: Row[];
}) {

    const router = useRouter();

const [recheckingId, setRecheckingId] = useState<string | null>(null);
const [issueActionId, setIssueActionId] = useState<string | null>(null);
const [actionError, setActionError] = useState<string | null>(null);

async function recheckTarget(targetId: string) {
  setRecheckingId(targetId);
  setActionError(null);

  try {
    const response = await fetch(
      `/api/admin/catalogue-health/targets/${targetId}/recheck`,
      {
        method: "POST",
      }
    );

    const json = await response.json().catch(() => ({}));

    if (!response.ok || !json.ok) {
      setActionError(
        json?.error ?? `Recheck failed (${response.status})`
      );
      return;
    }

    router.refresh();
  } catch (error) {
    console.error("[catalogue-health] recheck request failed", error);

    setActionError(
      "Unable to run the catalogue health check."
    );
  } finally {
    setRecheckingId(null);
  }
}

async function updateIssue(
  issueId: string,
  action: "acknowledge" | "ignore"
) {
  setIssueActionId(issueId);
  setActionError(null);

  try {
    const response = await fetch(
      `/api/admin/catalogue-health/issues/${issueId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      }
    );

    const json = await response.json().catch(() => ({}));

    if (!response.ok || !json.ok) {
      setActionError(
        json?.error ?? `Issue update failed (${response.status})`
      );
      return;
    }

    router.refresh();
  } catch (error) {
    console.error("[catalogue-health] issue action failed", error);

    setActionError("Unable to update the catalogue health issue.");
  } finally {
    setIssueActionId(null);
  }
}


  const [status, setStatus] = useState<
    "ALL" | HealthStatus
  >("ALL");

  const [targetType, setTargetType] = useState<
    "ALL" | TargetType
  >("ALL");

  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows
      .filter((row) => {
        if (status !== "ALL" && row.status !== status) {
          return false;
        }

        if (
          targetType !== "ALL" &&
          row.targetType !== targetType
        ) {
          return false;
        }

        if (!term) return true;

        const searchable = [
          row.product?.title,
          row.product?.slug,
          row.product?.brand.name,
          row.product?.brand.slug,
          row.url,
          row.failureType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(term);
      })
      .sort((a, b) => {
        const priority: Record<HealthStatus, number> = {
          BROKEN: 0,
          DEGRADED: 1,
          UNKNOWN: 2,
          HEALTHY: 3,
        };

        return priority[a.status] - priority[b.status];
      });
  }, [rows, search, status, targetType]);

  const attentionRows = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            row.status === "BROKEN" ||
            row.status === "DEGRADED"
        )
        .sort((a, b) => {
          if (a.status === b.status) {
            return (
              (b.lastFailedAt
                ? new Date(b.lastFailedAt).getTime()
                : 0) -
              (a.lastFailedAt
                ? new Date(a.lastFailedAt).getTime()
                : 0)
            );
          }

          return a.status === "BROKEN" ? -1 : 1;
        }),
    [rows]
  );

  return (
    
    <>
    {actionError ? (
  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {actionError}
  </div>
) : null}

      <SectionCard>
        <div className="border-b border-black/10 px-5 py-5 md:px-6">
          <div className="text-lg font-semibold text-black">
            Needs attention
          </div>

          <div className="mt-1 text-sm text-neutral-500">
            Broken and degraded catalogue destinations requiring review.
          </div>
        </div>

        {attentionRows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-sm font-medium text-emerald-800">
              No catalogue problems currently detected.
            </div>

            <div className="mt-1 text-sm text-neutral-500">
              The monitoring service will continue checking active targets.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {attentionRows.map((row) => (
              <AttentionRow
  key={row.id}
  row={row}
  rechecking={recheckingId === row.id}
  issueActionBusy={
    row.issue ? issueActionId === row.issue.id : false
  }
  onRecheck={() => void recheckTarget(row.id)}
  onAcknowledge={() => {
    if (row.issue) {
      void updateIssue(row.issue.id, "acknowledge");
    }
  }}
  onIgnore={() => {
    if (row.issue) {
      void updateIssue(row.issue.id, "ignore");
    }
  }}
/>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <div className="border-b border-black/10 px-5 py-5 md:px-6">
          <div className="text-lg font-semibold text-black">
            Monitored catalogue
          </div>

          <div className="mt-1 text-sm text-neutral-500">
            {filteredRows.length} of {rows.length} active monitoring targets.
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search product, brand or URL..."
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
            />

            <select
              aria-label="Filter catalogue health status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as "ALL" | HealthStatus
                )
              }
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="ALL">All health statuses</option>
              <option value="BROKEN">Broken</option>
              <option value="DEGRADED">Degraded</option>
              <option value="HEALTHY">Healthy</option>
              <option value="UNKNOWN">Never checked</option>
            </select>

            <select
              aria-label="Filter catalogue target type"
              value={targetType}
              onChange={(event) =>
                setTargetType(
                  event.target.value as "ALL" | TargetType
                )
              }
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="ALL">All target types</option>
              <option value="PRODUCT_SOURCE_URL">
                Product links
              </option>
              <option value="PRODUCT_AFFILIATE_URL">
                Affiliate links
              </option>
              <option value="PRODUCT_IMAGE">
                Product images
              </option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead>
              <tr className="bg-[#fdf7f4] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a89280]">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Brand</th>
                <th className="px-5 py-3">Target</th>
                <th className="px-5 py-3">Health</th>
                <th className="px-5 py-3">Problem</th>
                <th className="px-5 py-3">HTTP</th>
                <th className="px-5 py-3">Checked</th>
                <th className="px-5 py-3">Destination</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-black/5 align-top"
                >
                  <td className="px-5 py-4">
                    {row.product ? (
                      <div className="min-w-[180px]">
                        <div className="font-medium text-black">
                          {row.product.title}
                        </div>

                        <Link
                          href={`/admin/products/${row.product.id}`}
                          className="mt-1 inline-flex text-xs font-medium text-[#7B2D3E] underline decoration-[#7B2D3E]/30 underline-offset-2"
                        >
                          Edit product
                        </Link>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400">
                        Product unavailable
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-sm text-neutral-700">
                    {row.product?.brand.name ?? "—"}
                  </td>

                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-black">
                      {targetLabel(row.targetType)}
                    </div>

                    {row.targetType === "PRODUCT_IMAGE" &&
                    row.imageSortOrder !== null ? (
                      <div className="mt-1 text-xs text-neutral-500">
                        Image {row.imageSortOrder + 1}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${statusStyle(
                        row.status
                      )}`}
                    >
                      {row.status === "UNKNOWN"
                        ? "Unchecked"
                        : row.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="text-sm text-neutral-700">
                      {failureLabel(row.failureType)}
                    </div>

                    {row.issue ? (
                      <div className="mt-1 text-xs text-neutral-500">
                        {row.issue.failureCount} confirmed failure
                        {row.issue.failureCount === 1 ? "" : "s"}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-5 py-4 text-sm text-neutral-700">
                    {row.httpStatus ?? "—"}
                  </td>

                  <td className="px-5 py-4">
                    <div className="min-w-[150px] text-sm text-neutral-700">
                      {formatDate(row.lastCheckedAt)}
                    </div>

                    {row.responseTimeMs !== null ? (
                      <div className="mt-1 text-xs text-neutral-500">
                        {row.responseTimeMs} ms
                      </div>
                    ) : null}
                  </td>

                  <td className="px-5 py-4">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-w-[240px] truncate text-sm font-medium text-[#7B2D3E] underline decoration-[#7B2D3E]/30 underline-offset-2"
                      title={row.url}
                    >
                      {hostname(row.url)}
                    </a>
                  </td>

                  <td className="px-5 py-4">
  <button
    type="button"
    disabled={recheckingId === row.id}
    onClick={() => void recheckTarget(row.id)}
    className="inline-flex min-w-[88px] items-center justify-center rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:border-[#7B2D3E]/30 hover:text-[#7B2D3E] disabled:cursor-not-allowed disabled:opacity-50"
  >
    {recheckingId === row.id ? "Checking..." : "Recheck"}
  </button>
</td>
                </tr>
              ))}

              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-sm text-neutral-500"
                  >
                    No monitoring targets match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

function AttentionRow({
  row,
  rechecking,
  issueActionBusy,
  onRecheck,
  onAcknowledge,
  onIgnore,
}: {
  row: Row;
  rechecking: boolean;
  issueActionBusy: boolean;
  onRecheck: () => void;
  onAcknowledge: () => void;
  onIgnore: () => void;
}) {
  return (
    <div className="grid gap-5 px-5 py-5 md:px-6 xl:grid-cols-[minmax(0,1.4fr)_180px_180px_180px_auto] xl:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
  <span
    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${statusStyle(
      row.status
    )}`}
  >
    {row.status}
  </span>

  {row.issue ? (
    <span className="text-xs font-medium uppercase tracking-[0.1em] text-neutral-400">
      {row.issue.severity}
    </span>
  ) : null}

  {row.issue?.status === "ACKNOWLEDGED" ? (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
      Acknowledged
    </span>
  ) : null}
</div>

        <div className="mt-3 font-medium text-black">
          {row.product?.title ?? "Product unavailable"}
        </div>

        <div className="mt-1 text-sm text-neutral-500">
          {row.product?.brand.name ?? "Unknown brand"}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.12em] text-neutral-400">
          Target
        </div>

        <div className="mt-1 text-sm font-medium text-black">
          {targetLabel(row.targetType)}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.12em] text-neutral-400">
          Problem
        </div>

        <div className="mt-1 text-sm font-medium text-black">
          {failureLabel(row.failureType)}
        </div>

        {row.httpStatus ? (
          <div className="mt-1 text-xs text-neutral-500">
            HTTP {row.httpStatus}
          </div>
        ) : null}
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.12em] text-neutral-400">
          Last checked
        </div>

        <div className="mt-1 text-sm text-neutral-700">
          {formatDate(row.lastCheckedAt)}
        </div>
        
      </div>

      <div className="flex flex-wrap gap-2 xl:justify-end">
        <button
  type="button"
  disabled={rechecking}
  onClick={onRecheck}
  className="inline-flex min-w-[88px] items-center justify-center rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:border-[#7B2D3E]/30 hover:text-[#7B2D3E] disabled:cursor-not-allowed disabled:opacity-50"
>
  {rechecking ? "Checking..." : "Recheck"}
</button>
{row.issue?.status === "OPEN" ? (
  <button
    type="button"
    disabled={issueActionBusy}
    onClick={onAcknowledge}
    className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {issueActionBusy ? "Updating..." : "Acknowledge"}
  </button>
) : null}

{row.issue ? (
  <button
    type="button"
    disabled={issueActionBusy}
    onClick={onIgnore}
    className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
  >
    Ignore
  </button>
) : null}

        {row.product ? (
          <Link
            href={`/admin/products/${row.product.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-[#7B2D3E] px-3.5 py-2 text-xs font-medium text-white transition hover:bg-[#6a2435]"
          >
            Edit product
          </Link>
        ) : null}

        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03]"
        >
          Open URL
        </a>
      </div>
    </div>
  );
}