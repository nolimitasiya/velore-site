import { Suspense } from "react";
import UnsubscribedClient from "./UnsubscribedClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-14">Loading...</div>}>
      <UnsubscribedClient />
    </Suspense>
  );
}
