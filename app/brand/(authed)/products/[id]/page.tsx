import ProductEditClient from "./ProductEditClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Edit product</h1>
      <ProductEditClient id={id} />
    </main>
  );
}
