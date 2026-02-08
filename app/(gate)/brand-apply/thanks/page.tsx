export const metadata = { title: "Application received | Veilora Club" };

export default function BrandApplyThanksPage() {
  return (
    <main className="min-h-screen w-full bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">Veilora Club</h1>

        <p className="mt-6 text-sm text-neutral-600">
          Application received ✨ <br />
          Thank you for applying — we’ll review your details and get back to you shortly.
        </p>

        <a
          href="/"
          className="mt-10 inline-block text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
        >
          Back
        </a>
      </div>
    </main>
  );
}
