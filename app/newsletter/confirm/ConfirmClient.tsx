"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Status = "ok" | "invalid" | "missing";

export default function ConfirmClient() {
  const sp = useSearchParams();

  const raw = sp.get("status");
  const status: Status =
    raw === "ok" || raw === "invalid" || raw === "missing" ? raw : "missing";

  const copy: Record<Status, { eyebrow: string; title: string; body: string }> = {
    ok: {
      eyebrow: "You're in",
      title: "Subscription confirmed 💌",
      body: "Thanks for confirming — you're officially part of the edit. Expect early access to drops and modest styling picks straight to your inbox.",
    },
    invalid: {
      eyebrow: "Something went wrong",
      title: "Link expired or already used",
      body: "This confirmation link has already been used or has expired. Subscribe again to get a fresh one.",
    },
    missing: {
      eyebrow: "Something went wrong",
      title: "Missing confirmation link",
      body: "Please open the confirmation link from your email, or subscribe again to get a new one.",
    },
  };

  const isSuccess = status === "ok";

  return (
    <div className="min-h-screen bg-[#faf8f4] flex flex-col">

      {/* Burgundy header */}
      <div className="bg-[#7B2D3E] px-8 py-8 text-center">
        <Link
          href="/"
          className="font-heading text-3xl tracking-[0.08em] text-white hover:opacity-80 transition-opacity"
        >
          Veilora Club
        </Link>
        <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/50">
          Newsletter
        </div>
      </div>

      {/* Card */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[#e8ddd4] bg-white px-10 py-12 text-center">

            {/* Icon */}
            <div className={`mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full ${isSuccess ? "bg-[#7B2D3E]/8" : "bg-black/5"}`}>
              <span className="text-2xl">{isSuccess ? "💌" : "🔗"}</span>
            </div>

            {/* Eyebrow */}
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60 mb-2">
              {copy[status].eyebrow}
            </div>

            <h1 className="font-heading text-2xl text-[#1a0a0e]">
              {copy[status].title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#6b5c4e]">
              {copy[status].body}
            </p>

            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/"
                className="rounded-full bg-[#7B2D3E] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Back home
              </Link>
              <Link
                href="/search"
                className="rounded-full border border-black/15 bg-white px-6 py-2.5 text-sm text-black/70 transition hover:bg-black/[0.03]"
              >
                Browse
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-5 text-center text-[11px] tracking-[0.12em] text-[#7B2D3E]/40">
        © {new Date().getFullYear()} Veilora Club
      </div>

    </div>
  );
}