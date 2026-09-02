import { Suspense } from "react";
import LiveHome from "@/components/LiveHome";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LiveHome />
    </Suspense>
  );
}