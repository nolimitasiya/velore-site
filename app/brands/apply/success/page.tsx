import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Application received</h1>

      <p className="mt-3 text-neutral-600">
        Thanks — we’ve received your details. We’ll review your application and get back to you shortly.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-black px-5 py-2.5 text-sm text-white hover:opacity-90"
        >
          Back to home
        </Link>

        <Link
          href="/"
          className="rounded-full border px-5 py-2.5 text-sm hover:bg-black/5"
        >
          Browse
        </Link>
      </div>
    </main>
  );
}
