"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";

export default function AdminForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/admin/auth/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    setSent(true);
  }

  return (
    <AuthShell title="Admin Password Reset" variant="admin">

      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 w-full max-w-md space-y-6 border border-black/10"
      >

        {!sent ? (
          <>
            <input
              type="email"
              required
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-black/20 px-3 py-2 text-sm focus:outline-none"
            />

            <button
              disabled={loading}
              className="w-full bg-black text-white py-2 text-sm disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </>
        ) : (
          <div className="text-sm text-center space-y-4">
            <p>If the email exists, a reset link has been sent.</p>
            <button
              type="button"
              onClick={() => router.push("/admin/login")}
              className="underline text-black"
            >
              Back to login
            </button>
          </div>
        )}
      </form>
</AuthShell>
  );
}
