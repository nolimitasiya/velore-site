import NewsletterTableClient from "./NewsletterTableClient";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsletterPage() {
  const subs = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      source: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">admin/newsletter</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Subscribers, confirmations, exports, reminders.
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
