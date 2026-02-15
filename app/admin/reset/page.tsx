import { Suspense } from "react";
import ResetClient from "./ResetClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#eee]" />}>
      <ResetClient />
    </Suspense>
  );
}
