// C:\Users\Asiya\projects\dalra\app\brands\apply\success\page.tsx
import Link from "next/link";

export const metadata = { title: "Application received | Veilora Club" };

export default function Page() {
  return (
    <main className="min-h-screen w-full bg-[#faf8f4] flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">

        <div className="font-heading text-2xl tracking-[0.08em] text-[#7B2D3E]">
          Veilora Club
        </div>

        <div className="mx-auto mt-6 h-px w-10 bg-[#d8c9b5]" />

        <h1 className="mt-6 font-heading text-3xl text-[#1a0a0e] md:text-4xl">
          Application received.
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-[#6b5c4e]">
          Thank you for applying to Veilora Club. We'll carefully review your details and get back to you personally with the next steps. 💌
        </p>

        <p className="mt-3 text-xs text-[#a89280]">
          Keep an eye on your inbox.
        </p>

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
