export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();

  return (
    <main>
      <h1 className="text-2xl font-semibold">Search</h1>
      <p className="mt-2 text-gray-600">
        Showing results for: <span className="font-medium">{q || "—"}</span>
      </p>

      <div className="mt-6 rounded-2xl border p-4 text-sm text-gray-600">
        This is a placeholder. Next we’ll connect this to the database and filters.
      </div>
    </main>
  );
}
