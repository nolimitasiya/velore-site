import { prisma } from "@/lib/prisma";
import ContinentsAdminClient from "./ContinentsAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminContinentsPage() {
  const continents = await prisma.continent.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      region: true,
      imageUrl: true,
      sortOrder: true,
      isActive: true,
    },
  });

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8 md:px-8">

        {/* Hero */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Admin · Content
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Continents
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/60">
              Manage homepage continent cards, display order, and visibility settings.
            </p>
          </div>
        </section>

        <ContinentsAdminClient continents={continents} />
      </div>
    </main>
  );
}