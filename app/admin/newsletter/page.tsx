export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import NewsletterTableClient from "./NewsletterTableClient";

export default async function AdminNewsletterPage() {
  const subs = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      source: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Newsletter subscribers</h1>
      <p className="mt-1 text-sm text-black/60">
        Total shown: {subs.length}
      </p>

      <NewsletterTableClient
        subs={subs.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
