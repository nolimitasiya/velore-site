import Link from "next/link";
export const dynamic = "force-dynamic";

export default function UnsubscribedPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">You’re unsubscribed</h1>
      <p className="mt-3 text-sm text-black/70">
        You won’t receive any more newsletter emails from Veilora Club.
      </p>

      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm text-white"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
