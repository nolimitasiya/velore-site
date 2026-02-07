export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers } from "next/headers";
import Gate from "@/app/(gate)/Gate";
import LiveHome from "@/components/LiveHome";
import SiteShell from "@/components/SiteShell";

export default function Page() {
  headers();

  const launchMode = process.env.LAUNCH_MODE === "true";
  if (launchMode) return <Gate />;

  return (
    <SiteShell>
      <LiveHome />
    </SiteShell>
  );
}
