import { Suspense } from "react";
import BrandLoginClient from "./BrandLoginClient";

export default function BrandLoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-6" />}>
      <BrandLoginClient />
    </Suspense>
  );
}
