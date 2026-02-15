import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusSelect from "./StatusSelect";
import OnboardButton from "./OnboardButton";

export const dynamic = "force-dynamic";

type Status =
  | "all"
  | "new"
  | "contacted"
  | "invited"
  | "contract_sent"
  | "contract_signed"
  | "onboarded"
  | "rejected";

function statusBadge(status: string) {
  const s = String(status || "").toLowerCase();

  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border";

  if (s === "onboarded")
  return {
    cls: `${base} bg-purple-50 text-purple-800 border-purple-200`,
    label: "ONBOARDED",
  };


  if (s === "invited")
    return {
      cls: `${base} bg-blue-50 text-blue-700 border-blue-200`,
      label: "INVITED",
    };

    if (s === "contract_sent")
    return {
      cls: `${base} bg-yellow-50 text-yellow-800 border-yellow-200`,
      label: "CONTRACT SENT",
    };
    if (s === "contract_signed")
    return {
      cls: `${base} bg-green-50 text-green-800 border-green-200`,
      label: "CONTRACT SIGNED",
    };

  if (s === "contacted")
    return {
      cls: `${base} bg-amber-50 text-amber-800 border-amber-200`,
      label: "CONTACTED",
    };

  if (s === "rejected")
  return {
    cls: `${base} bg-orange-50 text-orange-800 border-orange-200`,
    label: "REJECTED",
  };


  return {
    cls: `${base} bg-neutral-50 text-neutral-700 border-neutral-200`,
    label: "NEW",
  };
}


function rowHighlight(status: unknown) {
  const s = String(status ?? "").trim().toLowerCase();

  if (s === "contacted") return "row--contacted";
  if (s === "invited") return "row--invited";
  if (s === "contract_sent") return "row--contract_sent";
  if (s === "contract_signed") return "row--contract_signed";
  if (s === "onboarded") return "row--onboarded";
  if (s === "rejected") return "row--rejected";
  return "row--new";
}


function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function FilterButton({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full border px-3 py-1.5 text-sm",
        active ? "bg-black text-white border-black" : "hover:bg-black/5",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function normalizeStatus(input?: string): Status {
  const s = String(input || "all").toLowerCase();
  if (
    s === "new" ||
    s === "contacted" ||
    s === "invited" ||
    s === "contract_sent" ||
    s === "contract_signed" ||
    s === "onboarded" ||
    s === "rejected"
  )
    return s;
  return "all";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;

  const status = normalizeStatus(sp.status);

  const range = String(sp.range || "all").toLowerCase();
const fromStr = sp.from ? String(sp.from) : "";
const toStr = sp.to ? String(sp.to) : "";


  
  const rangeLabel =
    range === "7d"
      ? "Last 7 days"
      : range === "30d"
      ? "Last 30 days"
      : range === "custom"
      ? "Custom range"
      : "All time";

  // --------
  // Date range computation
  // --------
  const now = new Date();

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  }
  function parseDateYYYYMMDD(s: string) {
    // safe parse for <input type="date"> values
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split("-").map((n) => Number(n));
    return new Date(y, m - 1, d);
  }

  let createdAtFilter: { gte?: Date; lt?: Date } | undefined;

  if (range === "7d") {
    const gte = startOfDay(addDays(now, -6)); // today + previous 6 days
    const lt = addDays(startOfDay(now), 1);   // tomorrow start (exclusive)
    createdAtFilter = { gte, lt };
  } else if (range === "30d") {
    const gte = startOfDay(addDays(now, -29));
    const lt = addDays(startOfDay(now), 1);
    createdAtFilter = { gte, lt };
  } else if (range === "custom" && (fromStr || toStr)) {
    const from = fromStr ? parseDateYYYYMMDD(fromStr) : null;
    const to = toStr ? parseDateYYYYMMDD(toStr) : null;
    

    const gte = from ? startOfDay(from) : undefined;
    // make "to" inclusive by using < (to + 1 day)
    const lt = to ? addDays(startOfDay(to), 1) : undefined;

    createdAtFilter = { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) };
  }

  // --------
  // Build WHERE
  // --------
  const whereBase: any = {};
  if (createdAtFilter) whereBase.createdAt = createdAtFilter;
  // --------
  // Daily submissions sparkline (server-only)
  // --------
  type DailyRow = { day: Date; count: number };

  // Decide the window for the sparkline
  const sparkDays =
    range === "7d" ? 7 : range === "30d" ? 30 : 14; // for custom/all, show last 14 days

  const sparkStart = startOfDay(addDays(now, -(sparkDays - 1)));
  const sparkEnd = addDays(startOfDay(now), 1); // tomorrow start (exclusive)

  // Use date range if the user selected one; otherwise default to recent days
  const dailyFrom = createdAtFilter?.gte ?? sparkStart;
  const dailyTo = createdAtFilter?.lt ?? sparkEnd;

  // NOTE: Table name must match your DB table. If yours is different, adjust.
  const dailyRaw = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
    select date_trunc('day', "createdAt") as day, count(*)::bigint as count
    from "BrandApplication"
    where "createdAt" >= ${dailyFrom}
      and "createdAt" < ${dailyTo}
    group by 1
    order by 1 asc
  `;

  // Build a complete day-by-day series so missing days show as 0
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const byDay = new Map<string, number>(
    dailyRaw.map((r) => [dayKey(r.day), Number(r.count)])
  );

  const series: DailyRow[] = [];
  const start = startOfDay(new Date(dailyFrom));
  const end = startOfDay(addDays(new Date(dailyTo), -1)); // inclusive end day
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    series.push({ day: new Date(d), count: byDay.get(dayKey(d)) ?? 0 });
  }

  // Keep the last N days for display
  const clipped = series.slice(-sparkDays);
  const dailyCounts = clipped.map((r) => r.count);

  const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const max = Math.max(1, ...dailyCounts);
  const spark = dailyCounts
    .map((n) => blocks[Math.min(7, Math.floor((n / max) * 7))])
    .join("");

  const where =
    status === "all"
      ? whereBase
      : { ...whereBase, status }; // enum values are lowercase in your schema

  // --------
  // Counts by status (respecting date range)
  // --------
  const rows = await prisma.brandApplication.groupBy({
    by: ["status"],
    where: whereBase, // counts reflect the date filter, not the status filter
    _count: { _all: true },
  });

  const counts: Record<string, number> = Object.fromEntries(
    rows.map((r) => [r.status, r._count._all])
  );
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const c = (s: string) => counts[s] ?? 0;

  // --------
  // Items (respecting status + date filters)
  // --------
  const items = await prisma.brandApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // helper for keeping query params in filter links
  const qs = (next: Partial<{ status: string; range: string; from: string; to: string }>) => {
    const params = new URLSearchParams();
    const merged = {
  status: sp.status ?? "all",
  range: sp.range ?? "all",
  from: sp.from ?? "",
  to: sp.to ?? "",
  ...next,
};


    // Only include non-defaults to keep URLs clean
    if (merged.status && merged.status !== "all") params.set("status", merged.status);
    if (merged.range && merged.range !== "all") params.set("range", merged.range);
    if (merged.range === "custom") {
      if (merged.from) params.set("from", merged.from);
      if (merged.to) params.set("to", merged.to);
    }

    const s = params.toString();
    return s ? `?${s}` : "";

  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Brand Applications</h1>
      <p className="mt-2 text-sm text-neutral-600">Inbound brand pipeline.</p>

      {/* Range chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <FilterButton
          label="All time"
          href={`/admin/brands/applications${qs({ range: "all", from: "", to: "" })}`}
          active={range === "all"}
        />
        <FilterButton
          label="Last 7 days"
          href={`/admin/brands/applications${qs({ range: "7d" })}`}
          active={range === "7d"}
        />
        <FilterButton
          label="Last 30 days"
          href={`/admin/brands/applications${qs({ range: "30d" })}`}
          active={range === "30d"}
        />
        
      </div>

      {/* Calendar filter (GET form) */}
      <form
        method="GET"
        action="/admin/brands/applications"
        className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border p-4"
      >
        {/* preserve status when using calendar */}
        <input type="hidden" name="status" value={status === "all" ? "all" : status} />
        <input type="hidden" name="range" value="custom" />

        <div className="flex flex-col gap-1">
  <label htmlFor="from" className="text-xs text-neutral-600">From</label>
  <input
    id="from"
    type="date"
    name="from"
    defaultValue={range === "custom" ? fromStr : ""}
    className="rounded-xl border px-3 py-2 text-sm"
  />
</div>

<div className="flex flex-col gap-1">
  <label htmlFor="to" className="text-xs text-neutral-600">To</label>
  <input
    id="to"
    type="date"
    name="to"
    defaultValue={range === "custom" ? toStr : ""}
    className="rounded-xl border px-3 py-2 text-sm"
  />
</div>


        <button className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90">
          Apply
        </button>

        <Link
          className="text-sm underline underline-offset-4 text-neutral-600 hover:text-neutral-900"
          href="/admin/brands/applications"
        >
          Reset
        </Link>
      </form>

      {/* Status filters with counts (respecting date range) */}
      <div className="mt-4 flex flex-wrap gap-2">
        <FilterButton
          label={`All (${total})`}
          href={`/admin/brands/applications${qs({ status: "all" })}`}
          active={status === "all"}
        />
        <FilterButton
          label={`New (${c("new")})`}
          href={`/admin/brands/applications${qs({ status: "new" })}`}
          active={status === "new"}
        />
        <FilterButton
          label={`Contacted (${c("contacted")})`}
          href={`/admin/brands/applications${qs({ status: "contacted" })}`}
          active={status === "contacted"}
        />
        <FilterButton
          label={`Invited (${c("invited")})`}
          href={`/admin/brands/applications${qs({ status: "invited" })}`}
          active={status === "invited"}
        />
        <FilterButton
          label={`contract sent (${c("contract_sent")})`}
          href={`/admin/brands/applications${qs({ status: "contract_sent" })}`}
          active={status === "contract_sent"}
        />
         <FilterButton
          label={`contract signed (${c("contract_signed")})`}
          href={`/admin/brands/applications${qs({ status: "contract_signed" })}`}
          active={status === "contract_signed"}
        />

        <FilterButton
          label={`Onboarded (${c("onboarded")})`}
          href={`/admin/brands/applications${qs({ status: "onboarded" })}`}
          active={status === "onboarded"}
        />
        <FilterButton
          label={`Rejected (${c("rejected")})`}
          href={`/admin/brands/applications${qs({ status: "rejected" })}`}
          active={status === "rejected"}
        />
      </div>
            <p className="mt-3 text-sm text-neutral-600">
        Showing <span className="font-medium text-neutral-900">{items.length}</span>{" "}
        application{items.length === 1 ? "" : "s"}{" "}
        <span className="text-neutral-500">({rangeLabel})</span>
      </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-700">
        <span className="font-medium">Daily submissions:</span>
        <span className="font-mono text-base leading-none">{spark}</span>
        <span className="text-neutral-500">
          (last {dailyCounts.length} days)
        </span>
      </div>



      <div className="mt-6 overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Website</th>
              <th className="px-4 py-3">Social</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Onboard</th>


            </tr>
          </thead>

          <tbody>
            {items.map((a) => {
              const name =
                [a.firstName, a.lastName].filter(Boolean).join(" ") || "—";
              const b = statusBadge(a.status);

              return (
                <tr
  key={a.id}
  className={[
    "border-t align-top",
    rowHighlight(a.status),
    "transition-colors hover:bg-black/[0.03]",
  ].join(" ")}
>


                

                  <td className="px-4 py-3 font-medium">{name}</td>

                  <td className="px-4 py-3">
                    <a className="underline" href={`mailto:${a.email}`}>
                      {a.email}
                    </a>
                  </td>

                  <td className="px-4 py-3">
                    {a.phone ? (
                      <a className="underline" href={`tel:${a.phone}`}>
                        {a.phone}
                      </a>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {a.website ? (
                      <a
                        className="underline"
                        href={a.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.website}
                      </a>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {a.socialMedia ? (
                      <a
                        className="underline"
                        href={
                          a.socialMedia.startsWith("http")
                            ? a.socialMedia
                            : `https://${a.socialMedia}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.socialMedia}
                      </a>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className={b.cls}>{b.label}</span>
                  </td>

                  <td className="px-4 py-3">{fmt(a.createdAt)}</td>
                  <td className="px-4 py-3"> <StatusSelect id={String(a.id)} value={String(a.status)} /> </td>
                  <td className="px-4 py-3">
  {String(a.status).toLowerCase() === "contract_signed" ? (
    <OnboardButton applicationId={String(a.id)} />
  ) : (
    <span className="text-xs text-neutral-400">—</span>
  )}
</td>

                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={8}>
                  No applications yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
