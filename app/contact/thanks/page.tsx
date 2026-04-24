import Link from "next/link";
import SiteShell from "@/components/SiteShell";

export const metadata = {
  title: "Thank You | Veilora Club",
};

export default function ContactThanksPage() {
  return (
    <SiteShell>
      <main className="min-h-[70vh] w-full bg-white text-neutral-900 flex items-center justify-center px-6 py-16 md:py-24">
        <div className="w-full max-w-xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
            Contact
          </p>

          <h1 className="font-heading text-3xl leading-tight md:text-5xl">
            Thank you for reaching out.
          </h1>

          <p className="mt-6 text-base leading-8 text-black/70 md:text-lg">
            We’ve received your message and our team will get back to you as
            soon as possible, usually within 24–48 hours.
          </p>

          <Link
            href="/"
            className="mt-10 inline-block text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
          >
            Back to home
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}