import SiteShell from "@/components/SiteShell";
import BrandApplyForm from "./BrandApplyForm";

export const metadata = {
  title: "Brand Apply | Veilora Club",
};

export default function Page() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[1800px] px-8 py-16 md:py-24">
        
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
            Partner with us
          </p>

          <h1 className="font-heading text-4xl leading-tight md:text-5xl">
            Join Veilora Club
          </h1>

          <p className="mt-4 mx-auto max-w-2xl text-sm md:text-base text-black/70 leading-7">
            Tell us a bit about your brand and how to reach you. We review every
            application carefully and will follow up personally.
          </p>
        </div>

        <div className="mt-12 mx-auto max-w-4xl">
          <BrandApplyForm />
        </div>

      </section>
    </SiteShell>
  );
}