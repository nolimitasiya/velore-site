import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center">
          <p className="text-sm text-[#a89280]">
            Loading...
          </p>
        </div>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}