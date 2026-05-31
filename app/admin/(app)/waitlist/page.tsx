import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function londonDayStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const utcGuess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const tzName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", timeZoneName: "shortOffset", hour: "2-digit",
  }).formatToParts(utcGuess).find((p) => p.type === "timeZoneName")?.value;
  const match = tzName?.match(/GMT([+-]\d{1,2})?/);
  const hoursOffset = match?.[1] ? Number(match[1]) : 0;
  return new Date(Date.UTC(y, m - 1, d, 0 - hoursOffset, 0, 0));
}

function londonMonthStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const firstDay = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const tzName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", timeZoneName: "shortOffset", hour: "2-digit",
  }).formatToParts(firstDay).find((p) => p.type === "timeZoneName")?.value;
  const match = tzName?.match(/GMT([+-]\d{1,2})?/);
  const hoursOffset = match?.[1] ? Number(match[1]) : 0;
  return new Date(Date.UTC(y, m - 1, 1, 0 - hoursOffset, 0, 0));
}

export default async function AdminWaitlistPage() {
  const { admin } = await requireAdminSession();
  const now = new Date();
  const startToday = londonDayStart(now);
  const startMonth = londonMonthStart(now);
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalCount, todayCount, last7dCount, monthCount, rows] = await Promise.all([
    prisma.waitlistSubscriber.count(),
    prisma.waitlistSubscriber.count({ where: { createdAt: { gte: startToday } } }),
    prisma.waitlistSubscriber.count({ where: { createdAt: { gte: start7d } } }),
    prisma.waitlistSubscriber.count({ where: { createdAt: { gte: startMonth } } }),
    prisma.waitlistSubscriber.findMany({ orderBy: { createdAt: "desc" }, take: 1000 }),
  ]);

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastSeenWaitlistAt: now },
  });

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">

        {/* Hero */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin · Community
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Waitlist
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/60">
                Shoppers who have signed up to be notified when Veilora Club launches.
                Today and this month use Europe/London boundaries.
              </p>
            </div>

            {/* Stat pills inside hero */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <div className="text-xs text-white/50">Total</div>
                <div className="mt-1 text-2xl font-semibold text-white">{totalCount}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <div className="text-xs text-white/50">Today</div>
                <div className="mt-1 text-2xl font-semibold text-white">{todayCount}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <div className="text-xs text-white/50">Last 7 days</div>
                <div className="mt-1 text-2xl font-semibold text-white">{last7dCount}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <div className="text-xs text-white/50">This month</div>
                <div className="mt-1 text-2xl font-semibold text-white">{monthCount}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="border-b border-[#e8ddd4] px-6 py-4">
            <div className="font-semibold text-black">All signups</div>
            <div className="mt-1 text-xs text-neutral-500">
              Showing latest {rows.length} of {totalCount} total
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-black/6 hover:bg-[#fdf7f4] transition-colors">
                  <td className="px-6 py-3.5 font-medium text-black">
                    {r.name ?? "—"}
                  </td>
                  <td className="px-6 py-3.5 text-neutral-700">
                    <a
                      href={`mailto:${r.email}`}
                      className="underline decoration-black/20 underline-offset-4 hover:text-black"
                    >
                      {r.email ?? "—"}
                    </a>
                  </td>
                  <td className="px-6 py-3.5 text-neutral-500">
                    {new Date(r.createdAt).toLocaleString("en-GB")}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-neutral-400" colSpan={3}>
                    No waitlist signups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

      </div>
    </main>
  );
}