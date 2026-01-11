export default function BrandsPage() {
  const brands = ["Batul Collection", "Veil Collection", "Summer Evening", "BySumayah"];

  return (
    <main>
      <h1 className="text-2xl font-semibold">Brands</h1>
      <p className="mt-2 text-gray-600">
        These are placeholders. Next, brands will come from the database.
      </p>

      <ul className="mt-6 space-y-3">
        {brands.map((b) => (
          <li key={b} className="rounded-2xl border p-4">
            {b}
          </li>
        ))}
      </ul>
    </main>
  );
}
