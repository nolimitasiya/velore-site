import Link from "next/link";

export const metadata = { title: "Thanks | Veilora Club" };

export default function ThanksPage() {
  return (
    <main className="min-h-screen w-full bg-white text-neutral-900 flex items-center justify-center px-6">

      <div className="w-full max-w-xl text-center">
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight text-black">
  Veilora Club
</h1>

        <p className="mt-6 text-sm text-neutral-900">
  Thank you, you’re on the waitlist 💌
  <br />
  We will notify you on our Launch Day for early exclusive release!
</p>


        {/* Back link */}
        <Link
          href="/"
          className="mt-10 inline-block text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
