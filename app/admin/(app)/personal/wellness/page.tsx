import { requireAdminSession } from "@/lib/auth/AdminSession";
import WellnessDashboard from "@/components/admin/wellness/WellnessDashboard";

export const dynamic = "force-dynamic";

export default async function WellnessPage() {
  await requireAdminSession();
  return <WellnessDashboard />;
}
