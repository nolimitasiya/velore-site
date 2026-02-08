import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminWaitlistPage() {
  const rows = await prisma.waitlistSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Waitlist</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Total signups: <span className="font-medium">{rows.length}</span>
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
                <td
                  className="px-4 py-8 text-center text-neutral-500"
                  colSpan={3}
                >
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
