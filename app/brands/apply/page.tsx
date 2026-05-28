// C:\Users\Asiya\projects\dalra\app\brands\apply\page.tsx
import BrandApplyForm from "./BrandApplyForm";

export const metadata = {
  title: "Brand Apply | Veilora Club",
};

export default function Page() {
  return (
    <main className="min-h-screen w-full bg-[#faf8f4]">

      {/* Header */}
      <div className="border-b border-[#e8ddd4] bg-[#faf8f4] px-8 py-6 text-center">
        <div className="font-heading text-2xl tracking-[0.08em] text-[#7B2D3E]">
          Veilora Club
        </div>
      </div>

      <section className="mx-auto w-full max-w-4xl px-6 py-14 md:px-8 md:py-20">

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7B2D3E]">
            Partner with us
          </p>
          <h1 className="mt-4 font-heading text-4xl leading-tight text-[#1a0a0e] md:text-5xl">
            Join Veilora Club
          </h1>
          <div className="mx-auto mt-4 h-px w-10 bg-[#d8c9b5]" />
          <p className="mt-5 text-sm leading-7 text-[#6b5c4e] md:text-base">
            Tell us a bit about your brand and how to reach you. We review every
            application carefully and will follow up personally.
          </p>
        </div>

        <div className="mt-12">
          <BrandApplyForm />
        </div>
      </section>
    </main>
  );
}
