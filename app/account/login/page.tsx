import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function AccountLoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-6" />}>
      <LoginClient />
    </Suspense>
  );
}