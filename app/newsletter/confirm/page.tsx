import { Suspense } from "react";
import ConfirmClient from "./ConfirmClient";

export default function ConfirmPage() {
  return (
    <Suspense fallback={<ConfirmFallback />}>
      <ConfirmClient />
    </Suspense>
  );
}

function ConfirmFallback() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Loading…</h1>
      <p className="mt-3 text-sm text-black/70">
        Confirming your subscription.
      </p>
    </div>
  );
}
