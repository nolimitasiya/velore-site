"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function UnsubscribedClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const status = sp.get("status") || "ok";

  const title =
    status === "ok"
      ? "You're unsubscribed"
      : status === "missing"
      ? "Unsubscribe link is missing"
      : status === "invalid"
      ? "Unsubscribe link is invalid"
      : "You're unsubscribed";

  const message =
    status === "ok"
      ? "We’re sorry to see you go 💔. You won’t receive any more Veilora Club emails."
      : status === "missing"
      ? "This unsubscribe link is missing a token. Please use the link from the email."
      : status === "invalid"
      ? "This unsubscribe link is invalid or expired. Please use the link from the email."
      : "We’re sorry to see you go.";

  return (
    <div className="mx-auto max-w-lg px-6 py-14">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-zinc-600">{message}</p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => router.push("/")}
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Back to home
        </button>

        <button
          onClick={() => router.push("/products")}
          className="rounded-md border px-4 py-2"
        >
          Browse products
        </button>
      </div>
    </div>
  );
}
