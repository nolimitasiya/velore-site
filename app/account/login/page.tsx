import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center">
          <div className="text-sm tracking-wide text-[#a89280]">
            Loading...
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}