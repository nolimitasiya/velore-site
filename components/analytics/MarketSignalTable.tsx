"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type SortKey =
  | "currentRank"
  | "impressions"
  | "views"
  | "wishlistAdds"
  | "shopClicks"
  | "viewRate"
  | "saveRate"
  | "shopIntentRate"
  | "momentum";

type SortDirection = "asc" | "desc";

type MarketSignalRow = {
  key: string;
  label: string;

  currentRank: number | null;
  previousRank: number | null;
  rankChange: number | null;

  impressions: number;
  views: number;
  wishlistAdds: number;
  shopClicks: number;

  viewRate: number;
  saveRate: number;
  shopIntentRate: number;

  momentumStatus:
    | "NEW"
    | "UP"
    | "DOWN"
    | "STABLE"
    | "LOW_SAMPLE";

  momentum: number;
};

function percent(
  value: number | null | undefined
) {
  return `${(
    Number(value ?? 0) * 100
  ).toFixed(1)}%`;
}

function RankBadge({
  rank,
  previousRank,
  rankChange,
}: {
  rank: number | null;
  previousRank: number | null;
  rankChange: number | null;
}) {
  if (rank == null) {
    return (
      <span className="text-xs text-neutral-400">
        —
      </span>
    );
  }

  if (previousRank == null) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="font-semibold text-black">
          #{rank}
        </span>

        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
          NEW
        </span>
      </div>
    );
  }

  if ((rankChange ?? 0) > 0) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="font-semibold text-black">
          #{rank}
        </span>

        <span className="text-xs font-semibold text-emerald-600">
          ↑{rankChange}
        </span>
      </div>
    );
  }

  if ((rankChange ?? 0) < 0) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="font-semibold text-black">
          #{rank}
        </span>

        <span className="text-xs font-semibold text-red-600">
          ↓{Math.abs(rankChange ?? 0)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="font-semibold text-black">
        #{rank}
      </span>

      <span className="text-xs font-semibold text-blue-600">
        →
      </span>
    </div>
  );
}

function MomentumBadge({
  status,
}: {
  status: MarketSignalRow["momentumStatus"];
}) {
  if (status === "LOW_SAMPLE") {
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        Low sample
      </span>
    );
  }

  if (status === "NEW") {
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
        🟣 ✦ New
      </span>
    );
  }

  if (status === "UP") {
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        🟢 ↑ Up
      </span>
    );
  }

  if (status === "DOWN") {
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
        🔴 ↓ Down
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
      🔵 → Stable
    </span>
  );
}

export default function MarketSignalTable({
  title,
  subtitle,
  rows,
  signalGroup,
  range = "30d",
  from = "",
  to = "",
  country = "all",
  source = "all",
}: {
  title: string;
  subtitle: string;
  rows: MarketSignalRow[];
  signalGroup: string;
  range?: string;
  from?: string;
  to?: string;
  country?: string;
  source?: string;
}) {
  const [sortKey, setSortKey] =
    useState<SortKey>("currentRank");

  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc"
          ? "desc"
          : "asc"
      );

      return;
    }

    setSortKey(key);

    // Rank naturally starts #1 → #2 → #3.
    // Other metrics naturally start highest → lowest.
    setSortDirection(
      key === "currentRank"
        ? "asc"
        : "desc"
    );
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aValue =
        Number(a[sortKey] ?? 0);

      const bValue =
        Number(b[sortKey] ?? 0);

      return sortDirection === "asc"
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [rows, sortKey, sortDirection]);

  function SortHeader({
    label,
    column,
  }: {
    label: string;
    column: SortKey;
  }) {
    const active =
      sortKey === column;

    return (
      <button
        type="button"
        onClick={() =>
          handleSort(column)
        }
        className="inline-flex w-full items-center justify-end gap-1 transition hover:text-black"
      >
        <span>{label}</span>

        <span
          className={
            active
              ? "text-[#7B2D3E]"
              : "text-neutral-300"
          }
        >
          {active
            ? sortDirection === "asc"
              ? "↑"
              : "↓"
            : "↕"}
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
      <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
        <div className="text-sm font-semibold text-black">
          {title}
        </div>

        <div className="mt-0.5 text-xs text-neutral-400">
          {subtitle}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
            <tr>
              <th className="px-4 py-3">
                Signal
              </th>

              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="Rank"
                  column="currentRank"
                />
              </th>

              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="Exposure"
                  column="impressions"
                />
              </th>

              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="Views"
                  column="views"
                />
              </th>

              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="Saves"
                  column="wishlistAdds"
                />
              </th>

              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="Shop"
                  column="shopClicks"
                />
              </th>

              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="View rate"
                  column="viewRate"
                />
              </th>

              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="Save rate"
                  column="saveRate"
                />
              </th>

              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="Intent rate"
                  column="shopIntentRate"
                />
              </th>

              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="Momentum"
                  column="momentum"
                />
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row.key}
                className="border-t border-black/6"
              >
                <td className="px-4 py-3.5 font-medium text-black">
  <Link
    href={`/admin/analytics/veilora-index/signal/${signalGroup}/${encodeURIComponent(
  row.key
)}?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`}
    className="transition hover:text-[#7B2D3E] hover:underline"
  >
    {row.label}
  </Link>
</td>

                <td className="px-4 py-3.5 text-right">
                  <RankBadge
                    rank={row.currentRank}
                    previousRank={
                      row.previousRank
                    }
                    rankChange={
                      row.rankChange
                    }
                  />
                </td>

                <td className="px-4 py-3.5 text-right">
                  {row.impressions}
                </td>

                <td className="px-4 py-3.5 text-right">
                  {row.views}
                </td>

                <td className="px-4 py-3.5 text-right">
                  {row.wishlistAdds}
                </td>

                <td className="px-4 py-3.5 text-right">
                  {row.shopClicks}
                </td>

                <td className="px-4 py-3.5 text-right">
                  {percent(row.viewRate)}
                </td>

                <td className="px-4 py-3.5 text-right">
                  {percent(row.saveRate)}
                </td>

                <td className="px-4 py-3.5 text-right font-semibold text-[#7B2D3E]">
                  {percent(
                    row.shopIntentRate
                  )}
                </td>

                <td className="px-4 py-3.5 text-right">
                  <MomentumBadge
                    status={row.momentumStatus}
                    />
                </td>
              </tr>
            ))}

            {!sortedRows.length ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-sm text-neutral-400"
                >
                  No signal data yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}