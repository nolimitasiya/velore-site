"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AdminResetPage() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token") || "";
  const email = params.get("email") || "";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || "Something went wrong");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/admin/login"), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eee]">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 w-full max-w-md space-y-6 border border-black/10"
      >
        <h1 className="text-xl font-semibold text-center">Set New Password</h1>

        {done ? (
          <p className="text-center text-sm">Password updated. Redirecting…</p>
        ) : (
          <>
            <input
              type="password"
              required
              minLength={8}
              placeholder="New password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-black/20 px-3 py-2 text-sm focus:outline-none"
            />

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <button
              disabled={loading}
              className="w-full bg-black text-white py-2 text-sm disabled:opacity-50"
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
