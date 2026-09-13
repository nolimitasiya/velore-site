// C:\Users\Asiya\projects\dalra\app\brands\apply\success\page.tsx

import Link from "next/link";

export const metadata = {
  title: "Application received | Veilora Club",
};

export default function Page() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#faf8f4] px-6">
      <div className="w-full max-w-md text-center">

        <div className="font-heading text-2xl tracking-[0.08em] text-[#7B2D3E]">
          Veilora Club
        </div>

        <div className="mx-auto mt-6 h-px w-10 bg-[#d8c9b5]" />

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]">
          Partnership Application
        </p>

        <h1 className="mt-4 font-heading text-3xl text-[#1a0a0e] md:text-4xl">
          Application received.
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[#6b5c4e]">
          Thank you for applying to partner with Veilora Club.
          We've received your application and will be reviewing your
          brand shortly.
        </p>

        <p className="mt-4 text-xs text-[#a89280]">
          Keep an eye on your inbox — we've sent you a confirmation email.
        </p>

        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#7B2D3E] underline underline-offset-4 transition-opacity hover:opacity-70"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}