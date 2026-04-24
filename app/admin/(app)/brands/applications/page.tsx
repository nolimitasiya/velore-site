import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusSelect from "./StatusSelect";
import OnboardButton from "./OnboardButton";
import { requireAdminSession } from "@/lib/auth/AdminSession";

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
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em]";

  if (s === "onboarded")
    return {
      cls: `${base} border-purple-200 bg-purple-50 text-purple-800`,
      label: "ONBOARDED",
    };

  if (s === "invited")
    return {
      cls: `${base} border-blue-200 bg-blue-50 text-blue-700`,
      label: "INVITED",
    };

  if (s === "contract_sent")
    return {
      cls: `${base} border-yellow-200 bg-yellow-50 text-yellow-800`,
      label: "CONTRACT SENT",
    };

  if (s === "contract_signed")
    return {
      cls: `${base} border-green-200 bg-green-50 text-green-800`,
      label: "CONTRACT SIGNED",
    };

  if (s === "contacted")
    return {
      cls: `${base} border-amber-200 bg-amber-50 text-amber-800`,
      label: "CONTACTED",
    };

  if (s === "rejected")
    return {
      cls: `${base} border-orange-200 bg-orange-50 text-orange-800`,
      label: "REJECTED",
    };

  return {
    cls: `${base} border-neutral-200 bg-neutral-50 text-neutral-700`,
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
  ) {
    return s;
  }
  return "all";
}

function PageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-[28px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
  subtext,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "dark" | "soft";
  subtext?: string;
}) {
  const toneClass =
    tone === "dark"
      ? "bg-black text-white border-black"
      : tone === "soft"
      ? "bg-neutral-50 text-neutral-900 border-black/5"
      : "bg-white text-neutral-900 border-black/10";

  const subtextClass =
    tone === "dark" ? "text-white/70" : "text-neutral-500";

  return (
    <div
      className={[
        "rounded-[24px] border p-5",
        toneClass,
      ].join(" ")}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {subtext ? (
        <p className={`mt-2 text-sm ${subtextClass}`}>{subtext}</p>
      ) : null}
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          {description}
        </p>
      ) : null}
    </div>
  );
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
        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-black bg-black text-white shadow-sm"
          : "border-black/10 bg-white text-neutral-700 hover:border-black/20 hover:bg-black/[0.03]",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full border border-black/10 bg-neutral-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            No applications
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-tight text-neutral-900">
            Nothing matches this view yet
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
            Try adjusting the date range or status filters to view more brand
            applications in the pipeline.
          </p>
        </div>
      </td>
    </tr>
  );
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
  const { admin } = await requireAdminSession();

  const now = new Date();

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastSeenApplicationsAt: now },
  });

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

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  }

  function parseDateYYYYMMDD(s: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split("-").map((n) => Number(n));
    return new Date(y, m - 1, d);
  }

  let createdAtFilter: { gte?: Date; lt?: Date } | undefined;

  if (range === "7d") {
    const gte = startOfDay(addDays(now, -6));
    const lt = addDays(startOfDay(now), 1);
    createdAtFilter = { gte, lt };
  } else if (range === "30d") {
    const gte = startOfDay(addDays(now, -29));
    const lt = addDays(startOfDay(now), 1);
    createdAtFilter = { gte, lt };
  } else if (range === "custom" && (fromStr || toStr)) {
    const from = fromStr ? parseDateYYYYMMDD(fromStr) : null;
    const to = toStr ? parseDateYYYYMMDD(toStr) : null;

    const gte = from ? startOfDay(from) : undefined;
    const lt = to ? addDays(startOfDay(to), 1) : undefined;

    createdAtFilter = { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) };
  }

  const whereBase: any = {};
  if (createdAtFilter) whereBase.createdAt = createdAtFilter;

  type DailyRow = { day: Date; count: number };

  const sparkDays = range === "7d" ? 7 : range === "30d" ? 30 : 14;
  const sparkStart = startOfDay(addDays(now, -(sparkDays - 1)));
  const sparkEnd = addDays(startOfDay(now), 1);

  const dailyFrom = createdAtFilter?.gte ?? sparkStart;
  const dailyTo = createdAtFilter?.lt ?? sparkEnd;

  const dailyRaw = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
    select date_trunc('day', "createdAt") as day, count(*)::bigint as count
    from "BrandApplication"
    where "createdAt" >= ${dailyFrom}
      and "createdAt" < ${dailyTo}
    group by 1
    order by 1 asc
  `;

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const byDay = new Map<string, number>(
    dailyRaw.map((r) => [dayKey(r.day), Number(r.count)])
  );

  const series: DailyRow[] = [];
  const start = startOfDay(new Date(dailyFrom));
  const end = startOfDay(addDays(new Date(dailyTo), -1));

  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    series.push({ day: new Date(d), count: byDay.get(dayKey(d)) ?? 0 });
  }

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
      : { ...whereBase, status };

  const rows = await prisma.brandApplication.groupBy({
    by: ["status"],
    where: whereBase,
    _count: { _all: true },
  });

  const counts: Record<string, number> = Object.fromEntries(
    rows.map((r) => [r.status, r._count._all])
  );

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const c = (s: string) => counts[s] ?? 0;

  const items = await prisma.brandApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const qs = (
    next: Partial<{ status: string; range: string; from: string; to: string }>
  ) => {
    const params = new URLSearchParams();
    const merged = {
      status: sp.status ?? "all",
      range: sp.range ?? "all",
      from: sp.from ?? "",
      to: sp.to ?? "",
      ...next,
    };

    if (merged.status && merged.status !== "all") {
      params.set("status", merged.status);
    }

    if (merged.range && merged.range !== "all") {
      params.set("range", merged.range);
    }

    if (merged.range === "custom") {
      if (merged.from) params.set("from", merged.from);
      if (merged.to) params.set("to", merged.to);
    }

    const s = params.toString();
    return s ? `?${s}` : "";
  };

  return (
    <PageShell>
      <div className="space-y-6">
        <SectionCard className="overflow-hidden">
          <div className="border-b border-black/5 bg-[linear-gradient(135deg,rgba(0,0,0,0.03),rgba(0,0,0,0))] px-6 py-6 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Brand pipeline
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
                  Brand Applications
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                  Review inbound partner interest, move applicants through each
                  stage, and onboard approved brands into Veilora with a cleaner
                  pipeline view.
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-neutral-600 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    Showing{" "}
                    <span className="font-semibold text-neutral-900">
                      {items.length}
                    </span>{" "}
                    application{items.length === 1 ? "" : "s"}
                  </span>
                  <span className="hidden h-4 w-px bg-black/10 sm:block" />
                  <span>{rangeLabel}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 xl:grid-cols-4 sm:px-8">
            <StatCard
              label="Total in range"
              value={total}
              tone="dark"
              subtext={rangeLabel}
            />
            <StatCard
              label="New"
              value={c("new")}
              subtext="Fresh submissions awaiting review"
            />
            <StatCard
              label="In progress"
              value={
                c("contacted") +
                c("invited") +
                c("contract_sent") +
                c("contract_signed")
              }
              subtext="Active pipeline movement"
            />
            <StatCard
              label="Onboarded"
              value={c("onboarded")}
              tone="soft"
              subtext="Successfully converted brands"
            />
          </div>
        </SectionCard>

        <SectionCard className="p-6 sm:p-8">
          <SectionIntro
            eyebrow="Filtering"
            title="Range and stage controls"
            description="Use date and pipeline filters to inspect recent submissions or focus on a specific application stage without changing the underlying workflow."
          />

          <div className="space-y-5">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Date range
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  label="All time"
                  href={`/admin/brands/applications${qs({
                    range: "all",
                    from: "",
                    to: "",
                  })}`}
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
            </div>

            <form
              method="GET"
              action="/admin/brands/applications"
              className="rounded-[24px] border border-black/10 bg-neutral-50/70 p-4 sm:p-5"
            >
              <input
                type="hidden"
                name="status"
                value={status === "all" ? "all" : status}
              />
              <input type="hidden" name="range" value="custom" />

              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="from"
                      className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500"
                    >
                      From
                    </label>
                    <input
                      id="from"
                      type="date"
                      name="from"
                      defaultValue={range === "custom" ? fromStr : ""}
                      className="h-11 rounded-2xl border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-black/5"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="to"
                      className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500"
                    >
                      To
                    </label>
                    <input
                      id="to"
                      type="date"
                      name="to"
                      defaultValue={range === "custom" ? toStr : ""}
                      className="h-11 rounded-2xl border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button className="inline-flex h-11 items-center rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:opacity-90">
                    Apply range
                  </button>

                  <Link
                    className="inline-flex h-11 items-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-medium text-neutral-700 transition hover:bg-black/[0.03]"
                    href="/admin/brands/applications"
                  >
                    Reset
                  </Link>
                </div>
              </div>
            </form>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Pipeline stage
              </p>
              <div className="flex flex-wrap gap-2">
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
                  href={`/admin/brands/applications${qs({
                    status: "contacted",
                  })}`}
                  active={status === "contacted"}
                />
                <FilterButton
                  label={`Invited (${c("invited")})`}
                  href={`/admin/brands/applications${qs({ status: "invited" })}`}
                  active={status === "invited"}
                />
                <FilterButton
                  label={`Contract sent (${c("contract_sent")})`}
                  href={`/admin/brands/applications${qs({
                    status: "contract_sent",
                  })}`}
                  active={status === "contract_sent"}
                />
                <FilterButton
                  label={`Contract signed (${c("contract_signed")})`}
                  href={`/admin/brands/applications${qs({
                    status: "contract_signed",
                  })}`}
                  active={status === "contract_signed"}
                />
                <FilterButton
                  label={`Onboarded (${c("onboarded")})`}
                  href={`/admin/brands/applications${qs({
                    status: "onboarded",
                  })}`}
                  active={status === "onboarded"}
                />
                <FilterButton
                  label={`Rejected (${c("rejected")})`}
                  href={`/admin/brands/applications${qs({
                    status: "rejected",
                  })}`}
                  active={status === "rejected"}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-black/10 bg-white px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-neutral-600">
                  Daily submissions trend for this view
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-mono text-lg leading-none text-neutral-900">
                    {spark}
                  </span>
                  <span className="text-neutral-500">
                    last {dailyCounts.length} days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="border-b border-black/5 px-6 py-5 sm:px-8">
            <SectionIntro
              eyebrow="Applications"
              title="Inbound brand queue"
              description="A premium operational view of every application, with direct contact details, current status, stage control, and onboarding access in one place."
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-neutral-50/80 text-left">
                <tr className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Website</th>
                  <th className="px-6 py-4 font-semibold">Social</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Created</th>
                  <th className="px-6 py-4 font-semibold">Stage</th>
                  <th className="px-6 py-4 font-semibold">Onboard</th>
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
                        "border-t border-black/5 align-top transition-colors hover:bg-black/[0.02]",
                        rowHighlight(a.status),
                      ].join(" ")}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-950">{name}</div>
                      </td>

                      <td className="px-6 py-4">
                        <a
                          className="break-all text-neutral-700 underline decoration-black/20 underline-offset-4 transition hover:text-neutral-950"
                          href={`mailto:${a.email}`}
                        >
                          {a.email}
                        </a>
                      </td>

                      <td className="px-6 py-4">
                        {a.phone ? (
                          <a
                            className="text-neutral-700 underline decoration-black/20 underline-offset-4 transition hover:text-neutral-950"
                            href={`tel:${a.phone}`}
                          >
                            {a.phone}
                          </a>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                     <td className="px-6 py-4">
  {a.website ? (
    <a
      className="break-all text-neutral-700 underline decoration-black/20 underline-offset-4 transition hover:text-neutral-950"
      href={
        a.website.startsWith("http")
          ? a.website
          : `https://${a.website}`
      }
      target="_blank"
      rel="noreferrer"
    >
      {a.website}
    </a>
  ) : (
    <span className="text-neutral-400">—</span>
  )}
</td>

                      <td className="px-6 py-4">
                        {a.socialMedia ? (
                          <a
                            className="break-all text-neutral-700 underline decoration-black/20 underline-offset-4 transition hover:text-neutral-950"
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
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={b.cls}>{b.label}</span>
                      </td>

                      <td className="px-6 py-4 text-neutral-600">
                        {fmt(a.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <StatusSelect
                          id={String(a.id)}
                          value={String(a.status)}
                        />
                      </td>

                      <td className="px-6 py-4">
                        {String(a.status).toLowerCase() ===
                        "contract_signed" ? (
                          <OnboardButton applicationId={String(a.id)} />
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && <EmptyRow colSpan={9} />}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}