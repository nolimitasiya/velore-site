import Link from "next/link";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";
import BrandRowClient from "./BrandRowClient";
import HomepageOrderControls from "./HomepageOrderControls";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBrandsPage() {
  await requireAdminSession();

   const brands = await prisma.brand.findMany({
    orderBy: [
      { showOnHomepage: "desc" },
      { homepageOrder: "asc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      accountStatus: true,
      affiliateStatus: true,
      affiliateProvider: true,
      affiliateBaseUrl: true,
      showOnHomepage: true,
      homepageOrder: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Brands</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Total: <span className="font-medium">{brands.length}</span>
          </p>
        </div>

        <Link
          href="/admin/brands/applications"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-black/5"
        >
          View Applications
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left">
            <tr>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Affiliate</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {brands.map((b) => (
              <BrandRowClient key={b.id} b={b} />
            ))}

            {brands.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-black/60" colSpan={4}>
                  No brands yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}