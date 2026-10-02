import MyFitForm from "./MyFitForm";

export default function MyFitPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="mt-2 font-heading text-3xl text-[#1a0a0e]">
          My Fit
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8b7768]">
          Save your measurements and fit preferences
          to help Veilora understand how pieces may
          fit you across different brands.
        </p>
      </div>

      <MyFitForm />
    </div>
  );
}