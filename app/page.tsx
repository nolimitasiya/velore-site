export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers } from "next/headers";
import LiveHome from "@/components/LiveHome";
import Gate from "@/app/(gate)/Gate";
import SiteShell from "@/components/SiteShell";

export default function Page() {
  headers(); // forces runtime, prevents static bake on Vercel

  const launchMode = process.env.LAUNCH_MODE === "true"; // true = Gate
  if (launchMode) return <Gate />;

  return (
    <SiteShell>
      <LiveHome />
    </SiteShell>
  );
}
