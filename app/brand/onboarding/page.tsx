import { Suspense } from "react";
import BrandOnboardingClient from "./BrandOnboardingClient";

export default function BrandOnboardingPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-6" />}>
      <BrandOnboardingClient />
    </Suspense>
  );
}


