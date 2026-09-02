"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function GraduationCampaignLogin() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!password.trim()) {
      setError("Enter the campaign password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/campaign/graduation-login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ?? "Incorrect password."
        );
        return;
      }

      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf8f4] px-6">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="font-heading text-4xl tracking-[0.05em] text-[#7B2D3E]">
            VEILORA CLUB
          </div>

          <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-black/40">
            Private Preview
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-black/10 bg-white p-8 md:p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#7B2D3E]">
            Girls&apos; Graduation
          </p>

          <h1 className="mt-3 font-heading text-3xl">
            Campaign Preview
          </h1>

          <p className="mt-3 text-sm leading-6 text-black/55">
            Enter the campaign password to access
            this private Veilora Club preview.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8"
          >
            <label
              htmlFor="campaign-password"
              className="text-xs uppercase tracking-[0.15em] text-black/60"
            >
              Password
            </label>

            <input
              id="campaign-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="mt-3 w-full rounded-full border border-black/15 px-5 py-3.5 text-sm outline-none transition focus:border-[#7B2D3E]"
              placeholder="Enter password"
            />

            {error && (
              <p className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-full bg-black px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#7B2D3E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Opening preview..."
                : "Enter Preview"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-black/35">
          Private campaign access · Veilora Club
        </p>
      </div>
    </div>
  );
}