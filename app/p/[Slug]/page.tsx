import Link from "next/link";

export default function ProductPage({ params }: { params: { slug: string } }) {
  return (
    <main className="max-w-3xl">
      <Link href="/" className="text-sm text-gray-600 hover:underline">
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Product: {params.slug}</h1>
      <p className="mt-2 text-gray-600">
        This is a placeholder product page. Next, we’ll load real product data from the DB.
      </p>

      <div className="mt-6 rounded-2xl border p-4">
        <button className="w-full rounded-2xl bg-black px-4 py-3 text-white">
          Shop on Brand (placeholder)
        </button>
      </div>
    </main>
  );
}

