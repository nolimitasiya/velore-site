import { Suspense } from "react";
import AdminLoginClient from "./AdminLoginClient";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-6" />}>
      <AdminLoginClient />
    </Suspense>
  );
}
