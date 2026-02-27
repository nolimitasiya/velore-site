import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import BrandSwitcher from "./BrandSwitcher";
import BrandNotesEditor from "./BrandNotesEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;

  const [brand, allBrands] = await Promise.all([
    prisma.brand.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!brand) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Brand not found</h1>
        <Link className="mt-4 inline-block text-sm underline" href="/admin/brands">
          Back to brands
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{brand.name}</h1>
          <p className="mt-1 text-sm text-black/50">{brand.slug}</p>
        </div>

        <div className="flex items-center gap-3">
          <BrandSwitcher currentId={brand.id} brands={allBrands} />

          <Link
            href="/admin/brands"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-black/5"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="text-xs text-black/50">Affiliate Status</div>
              <div className="mt-1 font-medium">{brand.affiliateStatus}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">Affiliate Provider</div>
              <div className="mt-1 font-medium">{brand.affiliateProvider ?? "-"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">Affiliate Base URL</div>
              <div className="mt-1 font-medium break-all">
                {brand.affiliateBaseUrl ?? "-"}
              </div>
            </div>

            <div>
              <div className="text-xs text-black/50">Website</div>
              <div className="mt-1 font-medium break-all">
                {brand.websiteUrl ?? "-"}
              </div>
            </div>
          </div>
        </div>

        <BrandNotesEditor brandId={brand.id} initialNotes={brand.notes} />
      </div>
    </main>
  );
}