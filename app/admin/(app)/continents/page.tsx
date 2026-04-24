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
    <main className="min-h-screen bg-[#f7f7f2]">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 md:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            Continents
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Manage homepage continent cards and continent display settings.
          </p>
        </div>

        <ContinentsAdminClient continents={continents} />
      </div>
    </main>
  );
}