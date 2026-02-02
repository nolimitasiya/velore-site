import BrandApplyForm from "./BrandApplyForm";

export const metadata = {
  title: "Brand Apply | Veilora Club",
};

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Brand Apply</h1>
      <p className="mt-2 text-sm text-neutral-600">
        We’re always open to discovering new modest brands. Share a few details and we’ll get back to you.
      </p>

      <div className="mt-8">
        <BrandApplyForm />
      </div>
    </main>
  );
}
