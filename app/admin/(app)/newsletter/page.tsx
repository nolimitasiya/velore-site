
import NewsletterTableClient from "./NewsletterTableClient";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      

      <NewsletterTableClient
        subs={subs.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
