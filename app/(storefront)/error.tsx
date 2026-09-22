"use client";

import { useEffect } from "react";
import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function StorefrontError({
  error,
  reset,
}: Props) {
  useEffect(() => {
    // Keep the real error visible in production logs.
    console.error("[storefront-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-[65vh] items-center justify-center px-6 py-20">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="mt-4 font-heading text-4xl text-[#7B2D3E] sm:text-5xl">
          We’re having trouble loading this right now.
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#806f62] sm:text-base">
          Please try again. If the problem continues, you can return to
          Veilora Club and keep browsing.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-[#7B2D3E] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Try again
          </button>

          <Link
            href="/"
            className="rounded-full border border-[#d9c8bd] bg-white px-6 py-3 text-sm font-medium text-[#7B2D3E] transition hover:border-[#7B2D3E]"
          >
            Back to Veilora
          </Link>
        </div>
      </div>
    </main>
  );
}