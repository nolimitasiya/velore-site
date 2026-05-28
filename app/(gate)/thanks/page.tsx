// C:\Users\Asiya\projects\dalra\app\(gate)\thanks\page.tsx
import Link from "next/link";

export const metadata = { title: "Thanks | Veilora Club" };

export default function ThanksPage() {
  return (
    <main className="min-h-screen w-full bg-[#faf8f4] flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">

        {/* Brand */}
        <div className="font-heading text-2xl tracking-[0.08em] text-[#7B2D3E]">
          Veilora Club
        </div>

        {/* Divider */}
        <div className="mx-auto mt-6 h-px w-10 bg-[#d8c9b5]" />

        {/* Message */}
        <h1 className="mt-6 font-heading text-3xl text-[#1a0a0e] md:text-4xl">
          You're on the list.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[#6b5c4e]">
          Thank you for joining — we'll be in touch with exclusive early access when Veilora Club launches. 💌
        </p>

        <p className="mt-3 text-xs text-[#a89280]">
          Keep an eye on your inbox.
        </p>

        {/* Back link */}
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#7B2D3E] underline underline-offset-4 hover:opacity-70 transition-opacity"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
