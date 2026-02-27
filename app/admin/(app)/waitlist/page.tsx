import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function londonDayStart(date = new Date()) {
  // Compute the start of "today" in Europe/London without extra deps.
  // Strategy: get London Y/M/D via Intl, then build a Date at 00:00 London
  // by converting that "wall clock" to UTC using the timezone offset.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);

  // "00:00" London represented as UTC baseline
  const utcGuess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

  // Find London offset at that moment
  const tzName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  })
    .formatToParts(utcGuess)
    .find((p) => p.type === "timeZoneName")?.value;

  // tzName like "GMT" or "GMT+1"
  const match = tzName?.match(/GMT([+-]\d{1,2})?/);
  const hoursOffset = match?.[1] ? Number(match[1]) : 0;

  // Convert London midnight to UTC time
  return new Date(Date.UTC(y, m - 1, d, 0 - hoursOffset, 0, 0));
}

function londonMonthStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);

  // First day of month at 00:00 London
  const firstDay = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));

  // Offset at month start
  const tzName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  })
    .formatToParts(firstDay)
    .find((p) => p.type === "timeZoneName")?.value;

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

  const [totalCount, todayCount, last7dCount, monthCount, rows] =
    await Promise.all([
      prisma.waitlistSubscriber.count(),
      prisma.waitlistSubscriber.count({ where: { createdAt: { gte: startToday } } }),
      prisma.waitlistSubscriber.count({ where: { createdAt: { gte: start7d } } }),
      prisma.waitlistSubscriber.count({ where: { createdAt: { gte: startMonth } } }),
      prisma.waitlistSubscriber.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ]);

  // Auto mark "seen" when opening the page
  await prisma.adminUser.update({
  where: { id: admin.id },
  data: { lastSeenWaitlistAt: now },
});

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Waitlist</h1>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border px-3 py-1 bg-white">
              Total: <span className="font-medium">{totalCount}</span>
            </span>
            <span className="rounded-full border px-3 py-1 bg-white">
              Today: <span className="font-medium">{todayCount}</span>
            </span>
            <span className="rounded-full border px-3 py-1 bg-white">
              Last 7 days: <span className="font-medium">{last7dCount}</span>
            </span>
            <span className="rounded-full border px-3 py-1 bg-white">
              This month: <span className="font-medium">{monthCount}</span>
            </span>
          </div>

          <p className="mt-2 text-xs text-neutral-500">
            “Today” and “This month” use Europe/London boundaries.
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3">{r.name ?? "—"}</td>
                <td className="px-4 py-3">{r.email ?? "—"}</td>
                <td className="px-4 py-3">
                  {new Date(r.createdAt).toLocaleString("en-GB")}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-neutral-500" colSpan={3}>
                  No waitlist signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}