import { prisma } from "@/lib/prisma";
// TODO: protect this route (middleware / auth). Keeping simple for now.

export default async function AdminNewsletterPage() {
  const subs = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Newsletter subscribers</h1>
      <p className="mt-1 text-sm text-black/60">
        Total shown: {subs.length}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
        <table className="w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-t border-black/5">
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3">{s.source ?? "-"}</td>
                <td className="px-4 py-3">{s.status}</td>
                <td className="px-4 py-3">
                  {new Date(s.createdAt).toLocaleString("en-GB")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
