"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function UnsubscribeClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirmUnsub() {
    setError("");
    setLoading(true);

    try {
      const r = await fetch("/api/newsletter/unsubscribe/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed to unsubscribe");

      router.push("/newsletter/unsubscribed?status=ok");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-14">
      <h1 className="text-2xl font-semibold">Confirm unsubscribe</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Are you sure you want to unsubscribe from Veilora Club emails?
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button
          onClick={confirmUnsub}
          disabled={!token || loading}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Unsubscribing..." : "Yes, unsubscribe"}
        </button>

        <button
          onClick={() => router.push("/")}
          className="rounded-md border px-4 py-2"
        >
          Keep me subscribed
        </button>
      </div>
    </div>
  );
}
