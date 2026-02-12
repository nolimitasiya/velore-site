export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers, cookies } from "next/headers";
import Gate from "@/app/(gate)/Gate";
import LiveHome from "@/components/LiveHome";
import SiteShell from "@/components/SiteShell";

export default async function Page() {
  headers();

  const launchMode = process.env.LAUNCH_MODE === "true";

  const cookieStore = await cookies(); // 👈 FIX
  const adminAuthed = Boolean(cookieStore.get("admin_authed")?.value);
  const brandAuthed = Boolean(cookieStore.get("brand_authed")?.value);

  const isAuthed = adminAuthed || brandAuthed;

  if (launchMode && !isAuthed) {
    return <Gate />;
  }

  return (
    <SiteShell>
      <LiveHome />
    </SiteShell>
  );
}
