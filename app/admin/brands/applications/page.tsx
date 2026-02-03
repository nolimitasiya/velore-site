import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function Page() {
  const items = await prisma.brandApplication.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Brand Applications</h1>
      <p className="mt-2 text-sm text-neutral-600">Inbound brand pipeline.</p>

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
            </tr>
          </thead>

          <tbody>
            {items.map((a) => {
              const name = [a.firstName, a.lastName].filter(Boolean).join(" ") || "—";
              return (
                <tr key={a.id} className="border-t align-top">
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
                      <a className="underline" href={a.website} target="_blank" rel="noreferrer">
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
                        href={a.socialMedia.startsWith("http") ? a.socialMedia : `https://${a.socialMedia}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.socialMedia}
                      </a>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3">{a.status}</td>
                  <td className="px-4 py-3">{fmt(a.createdAt)}</td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={7}>
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
