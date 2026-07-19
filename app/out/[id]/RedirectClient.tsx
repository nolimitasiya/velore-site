"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type RedirectClientProps = {
  productId: string;
  brandName: string;
  trackingQuery: string;
};

export default function RedirectClient({
  productId,
  brandName,
  trackingQuery,
}: RedirectClientProps) {
  const hasStarted = useRef(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;

    let redirectTimer: ReturnType<typeof setTimeout> | null =
      null;

    async function recordClickAndRedirect() {
      try {
        const endpoint = trackingQuery
          ? `/api/out/${productId}?${trackingQuery}`
          : `/api/out/${productId}`;

        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to open this brand.");
        }

        const responseText = await response.text();

if (!response.ok) {
  console.error("API response:", {
    status: response.status,
    statusText: response.statusText,
    body: responseText,
  });

  throw new Error(
    `Unable to open this brand. API returned ${response.status}.`
  );
}

let data: {
  destinationUrl?: string;
};

try {
  data = JSON.parse(responseText);
} catch {
  console.error("Expected JSON but received:", responseText);

  throw new Error(
    "The redirect endpoint returned an unexpected response."
  );
}

if (!data.destinationUrl) {
  throw new Error("Destination URL is missing.");
}

        redirectTimer = setTimeout(() => {
          window.location.replace(data.destinationUrl!);
        }, 1600);
      } catch (error) {
        console.error("Outbound redirect failed", error);

        setError(
          "We couldn’t redirect you to the brand. Please return to Veilora Club and try again."
        );
      }
    }

    void recordClickAndRedirect();

    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [productId, trackingQuery]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-6">
      <section className="w-full max-w-4xl text-center">
        <Image
          src="/icon.png"
          alt="Veilora Club"
          width={86}
          height={86}
          priority
          className="mx-auto mb-12 h-auto w-[72px] md:w-[86px]"
        />

        {error ? (
          <>
            <h1 className="font-display text-3xl leading-tight text-neutral-700 md:text-5xl">
              Something went wrong
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-neutral-500">
              {error}
            </p>

            <a
              href="/"
              className="mt-10 inline-flex border-b border-[#7f293e] pb-1 text-sm font-medium text-[#7f293e]"
            >
              Return to Veilora Club
            </a>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl font-normal leading-[1.15] tracking-[-0.02em] text-neutral-600 md:text-6xl">
              Redirecting you to{" "}
              <span className="italic text-neutral-700">
                {brandName}
              </span>
              <br />
              to complete your purchase
            </h1>

            <div
              className="mx-auto mt-14 h-10 w-10 animate-spin rounded-full border-[3px] border-neutral-200 border-t-[#7f293e]"
              role="status"
              aria-label={`Redirecting you to ${brandName}`}
            />

            <p className="mt-6 text-sm text-neutral-400">
              You’ll be redirected automatically.
            </p>
          </>
        )}
      </section>
    </main>
  );
}