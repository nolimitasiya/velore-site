import { requireAdminSession } from "@/lib/auth/AdminSession";
import RequestsClient from "./RequestsClient";

export const dynamic = "force-dynamic";

export default async function AdminTaxonomyRequestsPage() {
  await requireAdminSession();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Taxonomy requests</h1>
        <p className="text-sm text-black/60">Approve or reject brand-submitted materials, colours, and sizes.</p>
      </div>

      <RequestsClient />
    </div>
  );
}