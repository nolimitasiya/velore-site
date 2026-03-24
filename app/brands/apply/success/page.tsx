import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen w-full bg-white text-black flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight text-black">
          Veilora Club
        </h1>

        <p className="mt-4 text-sm text-neutral-600">
          Thank you for applying. We’ll carefully review your details and get
          back to you shortly with the next steps.
        </p>

        <Link
          href="/"
          className="mt-10 inline-flex items-center justify-center rounded-xl border border-black px-5 py-3 text-sm font-medium text-black transition hover:bg-black hover:text-white"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}