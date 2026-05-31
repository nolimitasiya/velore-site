import ProductsClient from "./ProductsClient";

export default function BrandProductsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Brand portal
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Products</h1>
          <p className="max-w-2xl text-sm leading-6 text-white/60">
            Manage your product listings, submit for review, and track approval status.
          </p>
        </div>
      </section>
      <ProductsClient />
    </div>
  );
}