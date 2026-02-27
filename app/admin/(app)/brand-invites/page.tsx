import { Suspense } from "react";
import BrandInvitesClient from "./BrandInvitesClient";

export default function AdminBrandInvitesPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <BrandInvitesClient />
    </Suspense>
  );
}
