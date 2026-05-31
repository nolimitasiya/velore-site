import { Suspense } from "react";
import RegisterClient from "./RegisterClient";

export default function AccountRegisterPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-6" />}>
      <RegisterClient />
    </Suspense>
  );
}