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

  const total = subs.length;
  const confirmed = subs.filter((s) => s.status === "confirmed").length;
  const pending = subs.filter((s) => s.status === "pending").length;

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
                Newsletter
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/60">
                Manage newsletter subscribers, send reminders to pending signups, and export your list.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <div className="text-xs text-white/50">Total</div>
                <div className="mt-1 text-2xl font-semibold text-white">{total}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <div className="text-xs text-white/50">Confirmed</div>
                <div className="mt-1 text-2xl font-semibold text-white">{confirmed}</div>
              </div>
              <div className="rounded-2xl border border-white/30 bg-white px-4 py-3">
                <div className="text-xs text-[#7B2D3E]/70">Pending</div>
                <div className="mt-1 text-2xl font-semibold text-[#7B2D3E]">{pending}</div>
              </div>
            </div>
          </div>
        </section>

        <NewsletterTableClient
          subs={subs.map((s) => ({
            ...s,
            createdAt: s.createdAt.toISOString(),
          }))}
        />

      </div>
    </main>
  );
}