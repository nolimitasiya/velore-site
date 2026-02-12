import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen w-full bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        {/* Brand name */}
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">
          Veilora Club
        </h1>

        {/* Message */}
        <p className="mt-4 text-sm text-neutral-600">
          Thank you for applying. We’ll carefully review your details and get
          back to you shortly with the next steps.
        </p>
        

        {/* Back link */}
        <Link
          href="/"
          className="mt-10 inline-block text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
