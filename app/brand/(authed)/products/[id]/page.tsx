import ProductEditClient from "./ProductEditClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Brand portal · Products
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Edit product</h1>
          <p className="max-w-2xl text-sm leading-6 text-white/60">
            Update product details, taxonomy, badges, and shipping before submitting for review.
          </p>
        </div>
      </section>
      <ProductEditClient id={id} />
    </div>
  );
}