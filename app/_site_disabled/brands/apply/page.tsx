import BrandApplyForm from "./BrandApplyForm";

export const metadata = {
  title: "Brand Apply | Veilora Club",
};

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-4xl font-semibold tracking-tight text-center">
        Brand Apply
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-neutral-600">
        Tell us a bit about your brand and how to reach you. We’ll follow up personally.
      </p>

      <div className="mt-10">
        <BrandApplyForm />
      </div>
    </main>
  );
}
