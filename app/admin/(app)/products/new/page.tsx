import Link from "next/link";
import AdminProductEditor from "./AdminProductEditor";

export const dynamic = "force-dynamic";

export default function AdminNewProductPage() {
  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="space-y-6">
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin catalogue · Products
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Add product
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-white/60">
                Create a curated Veilora product listing and assign it to a brand.
              </p>
            </div>

            <Link
              href="/admin/products"
              className="inline-flex w-fit items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              ← Back to products
            </Link>
          </div>
        </section>

        <AdminProductEditor />
      </div>
    </main>
  );
}